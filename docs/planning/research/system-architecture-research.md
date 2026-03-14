# YHAI 시스템 아키텍처 설계를 위한 기술 조사 리포트

- 작성일: 2026-03-14
- 조사 목적: YHAI Plan 3 시스템 아키텍처 설계를 위한 핵심 기술 패턴 및 구현 방법 조사
- 기술 스택 범위: Next.js 15 + Supabase, NestJS + BullMQ, Claude API, Vercel REST API, Upstash Redis

---

## 핵심 발견사항 (Executive Summary)

1. **Next.js 15 + Supabase 인증**: `@supabase/ssr` 패키지의 `createServerClient`를 사용하는 서버/클라이언트 이중 클라이언트 패턴이 공식 권장 방식이다. 미들웨어에서 세션 갱신, Server Components에서 `auth.getUser()`로 인증 검증이 표준이다.
2. **멀티 에이전트 오케스트레이션**: 오케스트레이터-서브에이전트 계층 구조 + Redis 기반 태스크 큐 + 위상 정렬(topological sort)을 통한 의존성 기반 병렬 실행이 검증된 패턴이다.
3. **실시간 통신**: AI 스트리밍에는 SSE(단방향 Server Push), 양방향 채팅 기능에는 Supabase Realtime(WebSocket 기반 Phoenix Channels), 빌드 진행상황에는 SSE가 최적이다.
4. **Vercel REST API**: 파일 업로드 후 배포 생성의 2단계 플로우로 완전한 프로그래매틱 배포가 가능하며, 환경변수 설정 API도 제공된다.
5. **멀티테넌트 보안**: Supabase RLS의 `auth.uid()` 기반 정책이 테넌트 격리의 핵심이며, `service_role` 키는 반드시 서버 사이드에서만 사용해야 한다.

---

## 상세 조사 결과

### 1. Next.js 15 + Supabase 통합 아키텍처 패턴

#### 1.1 핵심 원칙

Next.js 15 App Router 환경에서 Supabase를 사용할 때 가장 중요한 원칙은 **두 종류의 클라이언트를 분리**하는 것이다.

- **Server Client**: Server Components, Server Actions, Route Handlers, Middleware에서 사용
- **Browser Client**: Client Components에서 사용

Server Components는 쿠키를 직접 쓸 수 없으므로, 미들웨어가 만료된 Auth 토큰을 갱신하고 쿠키를 업데이트하는 역할을 담당한다.

#### 1.2 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

환경변수 (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # 서버 전용, 절대 클라이언트 노출 금지
```

#### 1.3 Server Client 구현 (`utils/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components에서 set 호출 시 무시 (미들웨어가 처리)
          }
        },
      },
    }
  )
}
```

#### 1.4 Browser Client 구현 (`utils/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

#### 1.5 미들웨어 설정 (`middleware.ts`)

미들웨어는 모든 요청에서 세션을 갱신한다. Server Components가 최신 세션 데이터를 읽을 수 있도록 보장한다.

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 반드시 getUser()를 호출해야 토큰이 갱신됨
  // getSession()은 서버 코드에서 신뢰할 수 없음 - JWT 재검증 불가
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

#### 1.6 Server Action에서 Supabase 사용 예시

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createProject(formData: FormData) {
  const supabase = createClient()

  // 인증 확인 - 항상 getUser()로 검증
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const projectName = formData.get('name') as string

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: projectName,
      user_id: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data }
}
```

#### 1.7 아키텍처 다이어그램

```
클라이언트 브라우저
    │
    │ HTTP Request (with cookies)
    ▼
┌─────────────────────────────────────┐
│         Next.js Middleware          │
│  createServerClient (cookie read)   │
│  supabase.auth.getUser() ──────────────► Supabase Auth Server
│  토큰 갱신 → 쿠키 업데이트          │         (JWT 검증)
└─────────────────────────────────────┘
    │
    │ 갱신된 세션 쿠키
    ▼
┌─────────────────────────────────────┐
│         Server Components           │
│  createClient() (server)            │
│  supabase.auth.getUser()            │
│  supabase.from('table').select()    │
│  → RLS 정책 자동 적용               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         Client Components           │
│  createClient() (browser)           │
│  실시간 구독, 사용자 인터랙션        │
└─────────────────────────────────────┘
```

---

### 2. 멀티 에이전트 시스템 백엔드 아키텍처

#### 2.1 오케스트레이터-서브에이전트 패턴

YHAI의 AI 웹사이트 빌드 시스템은 **계층형 메타 에이전트 설계**를 채택한다. 오케스트레이터는 전체 계획과 태스크 분배를 담당하고, 전문화된 서브에이전트들이 실제 코드 생성을 수행한다.

**에이전트 역할 분담:**
- **Orchestrator Agent**: 요구사항 분석, 태스크 분해, 의존성 그래프 생성, 병렬 실행 조율
- **Requirements Agent**: 사용자 대화에서 요구사항 추출, 명세서 생성
- **Architecture Agent**: 기술 스택 선택, 파일 구조 설계
- **Frontend Agent**: React/Next.js 컴포넌트 코드 생성
- **Backend Agent**: API 엔드포인트, 데이터 모델 생성
- **Deployment Agent**: Vercel 배포 실행, 환경변수 설정

#### 2.2 NestJS + BullMQ 태스크 큐 아키텍처

```typescript
// agent-queue.module.ts
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'agent-tasks',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    }),
  ],
})
export class AgentQueueModule {}
```

```typescript
// agent-orchestrator.service.ts
import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { Queue } from 'bullmq'

export interface AgentTask {
  taskId: string
  buildId: string
  agentType: 'requirements' | 'architecture' | 'frontend' | 'backend' | 'deployment'
  payload: Record<string, unknown>
  dependencies: string[]  // 선행 완료 필요 taskId 목록
  priority: number
}

@Injectable()
export class AgentOrchestratorService {
  constructor(
    @InjectQueue('agent-tasks') private readonly agentQueue: Queue,
  ) {}

  async orchestrateBuild(buildId: string, requirements: string): Promise<void> {
    // 1단계: 태스크 그래프 생성
    const taskGraph = this.createTaskGraph(buildId, requirements)

    // 2단계: 위상 정렬로 실행 순서 결정
    const sortedTasks = this.topologicalSort(taskGraph)

    // 3단계: 의존성 없는 태스크 즉시 큐에 추가
    for (const task of sortedTasks) {
      if (task.dependencies.length === 0) {
        await this.agentQueue.add(task.agentType, task, {
          priority: task.priority,
          jobId: task.taskId,
        })
      }
    }
  }

  private createTaskGraph(buildId: string, requirements: string): AgentTask[] {
    return [
      {
        taskId: `${buildId}-req`,
        buildId,
        agentType: 'requirements',
        payload: { requirements },
        dependencies: [],
        priority: 10,
      },
      {
        taskId: `${buildId}-arch`,
        buildId,
        agentType: 'architecture',
        payload: {},
        dependencies: [`${buildId}-req`],
        priority: 8,
      },
      {
        taskId: `${buildId}-frontend`,
        buildId,
        agentType: 'frontend',
        payload: {},
        dependencies: [`${buildId}-arch`],
        priority: 6,
      },
      {
        taskId: `${buildId}-backend`,
        buildId,
        agentType: 'backend',
        payload: {},
        dependencies: [`${buildId}-arch`],
        priority: 6,
      },
      {
        taskId: `${buildId}-deploy`,
        buildId,
        agentType: 'deployment',
        payload: {},
        dependencies: [`${buildId}-frontend`, `${buildId}-backend`],
        priority: 4,
      },
    ]
  }

  private topologicalSort(tasks: AgentTask[]): AgentTask[] {
    const visited = new Set<string>()
    const result: AgentTask[] = []
    const taskMap = new Map(tasks.map(t => [t.taskId, t]))

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return
      visited.add(taskId)
      const task = taskMap.get(taskId)!
      for (const dep of task.dependencies) {
        visit(dep)
      }
      result.push(task)
    }

    for (const task of tasks) {
      visit(task.taskId)
    }

    return result
  }
}
```

```typescript
// agent-worker.processor.ts
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Job } from 'bullmq'
import Anthropic from '@anthropic-ai/sdk'

@Processor('agent-tasks')
export class AgentWorkerProcessor extends WorkerHost {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async process(job: Job<AgentTask>): Promise<unknown> {
    const { agentType, buildId, payload } = job.data

    // 진행상황 Supabase Realtime으로 브로드캐스트
    await this.broadcastProgress(buildId, agentType, 'running')

    try {
      let result: unknown

      switch (agentType) {
        case 'requirements':
          result = await this.runRequirementsAgent(payload)
          break
        case 'frontend':
          result = await this.runFrontendAgent(payload)
          break
        case 'backend':
          result = await this.runBackendAgent(payload)
          break
        case 'deployment':
          result = await this.runDeploymentAgent(buildId, payload)
          break
      }

      await this.broadcastProgress(buildId, agentType, 'completed', result)
      await this.activateDependentTasks(buildId, job.id!)

      return result
    } catch (error) {
      await this.broadcastProgress(buildId, agentType, 'failed', { error })
      throw error
    }
  }

  private async runFrontendAgent(payload: Record<string, unknown>): Promise<unknown> {
    const stream = await this.anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8192,
      system: `당신은 Next.js 15 + React 19 전문 프론트엔드 개발자입니다.
               주어진 요구사항을 기반으로 완전한 컴포넌트 코드를 생성하세요.`,
      messages: [
        { role: 'user', content: JSON.stringify(payload) }
      ],
    })

    const response = await stream.finalMessage()
    return { code: response.content[0].type === 'text' ? response.content[0].text : '' }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed for build ${job.data.buildId}`)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error.message)
  }
}
```

#### 2.3 에이전트 간 상태 공유 (Upstash Redis)

```typescript
// build-state.service.ts
import { Injectable } from '@nestjs/common'
import { Redis } from '@upstash/redis'

@Injectable()
export class BuildStateService {
  private redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // 에이전트 결과 저장
  async saveAgentResult(buildId: string, agentType: string, result: unknown): Promise<void> {
    await this.redis.hset(`build:${buildId}:results`, {
      [agentType]: JSON.stringify(result),
    })
    // TTL 24시간
    await this.redis.expire(`build:${buildId}:results`, 86400)
  }

  // 이전 에이전트 결과 조회 (다음 에이전트가 컨텍스트로 활용)
  async getAgentResult(buildId: string, agentType: string): Promise<unknown> {
    const raw = await this.redis.hget(`build:${buildId}:results`, agentType)
    return raw ? JSON.parse(raw as string) : null
  }

  // 파일 락 - 동시 수정 방지
  async acquireFileLock(buildId: string, filePath: string): Promise<boolean> {
    const lockKey = `lock:${buildId}:${filePath}`
    const result = await this.redis.set(lockKey, '1', {
      nx: true,       // 존재하지 않을 때만 설정
      ex: 300,        // 5분 TTL
    })
    return result === 'OK'
  }

  async releaseFileLock(buildId: string, filePath: string): Promise<void> {
    await this.redis.del(`lock:${buildId}:${filePath}`)
  }
}
```

#### 2.4 아키텍처 다이어그램

```
사용자 요청 (AI와 대화 → 요구사항 확정)
    │
    ▼
┌─────────────────────────────────────────┐
│          NestJS API Gateway             │
│  POST /builds → BuildsController       │
│  → AgentOrchestratorService            │
└─────────────────┬───────────────────────┘
                  │ 태스크 그래프 생성 + 위상 정렬
                  ▼
┌─────────────────────────────────────────┐
│         Upstash Redis (BullMQ)          │
│  Queue: agent-tasks                     │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │req-task │ │arch-task│ │fe-task   │  │
│  │priority:│ │priority:│ │priority: │  │
│  │  10     │ │  8      │ │  6       │  │
│  └────┬────┘ └────┬────┘ └────┬─────┘  │
└───────┼───────────┼───────────┼─────────┘
        │           │           │
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Req Agent │ │Arch Agent │ │ FE Agent  │
│ (Worker)  │ │ (Worker)  │ │ (Worker)  │
│           │ │           │ │           │
│ Claude API│ │ Claude API│ │ Claude API│
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │
      └─────────────┼─────────────┘
                    │ 결과 → Redis 저장
                    ▼
             ┌─────────────┐
             │Deploy Agent │
             │             │
             │ Vercel API  │
             └──────┬──────┘
                    │
                    ▼
             Vercel 배포 완료
                    │
                    ▼
        Supabase Realtime 브로드캐스트
        → 사용자 브라우저에 URL 전달
```

---

### 3. 실시간 통신 설계

#### 3.1 SSE vs WebSocket vs Supabase Realtime 비교

| 특성 | SSE | WebSocket | Supabase Realtime |
|------|-----|-----------|-------------------|
| 통신 방향 | 단방향 (Server→Client) | 양방향 | 양방향 (WebSocket 기반) |
| 프로토콜 | HTTP/1.1 | TCP | WebSocket (Phoenix) |
| Vercel 지원 | 완벽 지원 | 제한적 | 완벽 지원 |
| 구현 복잡도 | 낮음 | 높음 | 중간 (SDK 제공) |
| 재연결 | 브라우저 자동 처리 | 수동 구현 필요 | SDK 자동 처리 |
| 주요 용도 | AI 스트리밍, 빌드 진행상황 | 실시간 협업 에디터 | DB 변경 구독, Presence |
| Vercel 함수 제한 | Edge Function에서 작동 | 불가 | 외부 서비스 |

**YHAI 권장 아키텍처:**
- **AI 채팅 스트리밍**: SSE (Claude API → Next.js Route Handler → 클라이언트)
- **빌드 진행상황 업데이트**: Supabase Realtime (NestJS → Supabase → 클라이언트)
- **프로젝트 목록 실시간 갱신**: Supabase Realtime (DB Postgres Changes)

#### 3.2 AI 채팅 스트리밍 구현 (SSE)

```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, buildId } = await request.json()

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          system: `당신은 YHAI의 AI 웹사이트 빌드 전문가입니다.
                   사용자의 요구사항을 분석하고 웹사이트 설계를 도와주세요.`,
          messages,
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({
              type: 'text',
              content: event.delta.text,
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          if (event.type === 'message_stop') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          }
        }

        controller.close()
      } catch (error) {
        const errData = JSON.stringify({ type: 'error', message: String(error) })
        controller.enqueue(encoder.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Nginx 버퍼링 비활성화
    },
  })
}
```

```typescript
// 클라이언트 컴포넌트에서 SSE 소비
'use client'

import { useState } from 'react'

export function ChatWindow({ buildId }: { buildId: string }) {
  const [streamingText, setStreamingText] = useState('')

  const sendMessage = async (userMessage: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
        buildId,
      }),
    })

    if (!response.body) return

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader()

    let accumulated = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      // SSE 데이터 파싱
      const lines = value.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'text') {
            accumulated += data.content
            setStreamingText(accumulated)
          }
        }
      }
    }
  }

  return <div>{streamingText}</div>
}
```

#### 3.3 빌드 진행상황 실시간 업데이트 (Supabase Realtime)

```typescript
// NestJS 워커에서 Supabase Realtime으로 진행상황 브로드캐스트
// build-progress.service.ts
import { Injectable } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'

@Injectable()
export class BuildProgressService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // 서버 전용
  )

  async broadcastProgress(
    buildId: string,
    agentType: string,
    status: 'running' | 'completed' | 'failed',
    data?: unknown,
  ): Promise<void> {
    // 1. DB 업데이트 (RLS 우회하여 진행상황 기록)
    await this.supabase
      .from('build_events')
      .insert({
        build_id: buildId,
        agent_type: agentType,
        status,
        data: data ?? null,
        created_at: new Date().toISOString(),
      })

    // 2. Realtime Broadcast (DB 구독 없이 직접 채널 브로드캐스트)
    await this.supabase
      .channel(`build:${buildId}`)
      .send({
        type: 'broadcast',
        event: 'progress',
        payload: { agentType, status, data },
      })
  }
}
```

```typescript
// 클라이언트에서 빌드 진행상황 구독
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface BuildProgress {
  agentType: string
  status: 'running' | 'completed' | 'failed'
  data?: unknown
}

export function BuildProgressMonitor({ buildId }: { buildId: string }) {
  const [progress, setProgress] = useState<BuildProgress[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`build:${buildId}`)
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        setProgress(prev => [...prev, payload as BuildProgress])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [buildId, supabase])

  return (
    <ul>
      {progress.map((p, i) => (
        <li key={i}>{p.agentType}: {p.status}</li>
      ))}
    </ul>
  )
}
```

#### 3.4 실시간 통신 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 브라우저                      │
│                                                              │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   AI 채팅 컴포넌트   │    │  빌드 진행상황 모니터     │   │
│  │  fetch() + stream   │    │  supabase.channel()       │   │
│  │  ReadableStream     │    │  .on('broadcast', ...)    │   │
│  └──────────┬──────────┘    └───────────┬──────────────┘   │
└─────────────┼───────────────────────────┼───────────────────┘
              │ SSE (HTTP)                │ WebSocket
              ▼                           ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  Next.js Route      │    │    Supabase Realtime          │
│  Handler            │    │    (Elixir Phoenix Cluster)   │
│  /api/chat          │    │                               │
│  ReadableStream     │    │    Channel: build:{buildId}   │
│  text/event-stream  │    │    Broadcast / Postgres Changes│
└──────────┬──────────┘    └───────────────┬───────────────┘
           │                               ▲
           │ streaming                     │ insert
           ▼                               │
┌─────────────────────┐    ┌──────────────────────────────┐
│    Claude API       │    │      NestJS Workers           │
│  claude-opus-4-6    │    │  BuildProgressService         │
│  SSE stream         │    │  supabase.from('build_events')│
└─────────────────────┘    │  .insert(...)                 │
                           └──────────────────────────────┘
```

---

### 4. Vercel REST API 기반 자동 배포

#### 4.1 전체 배포 플로우

Vercel REST API를 통한 프로그래매틱 배포는 3단계로 구성된다:
1. 파일 업로드 (SHA1 해시 기반 중복 제거)
2. 배포 생성 (업로드된 파일 참조)
3. 환경변수 설정 (배포 후 또는 배포 전 프로젝트에 설정)

#### 4.2 파일 업로드

```typescript
// vercel-deployment.service.ts
import { Injectable } from '@nestjs/common'
import crypto from 'crypto'

interface VercelFile {
  file: string    // 파일 경로
  sha: string     // SHA1 해시
  size: number    // 파일 크기 (bytes)
}

@Injectable()
export class VercelDeploymentService {
  private readonly baseUrl = 'https://api.vercel.com'
  private readonly token = process.env.VERCEL_API_TOKEN!
  private readonly teamId = process.env.VERCEL_TEAM_ID  // optional

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/octet-stream',
    }
  }

  // 1단계: 파일 업로드
  async uploadFile(content: string | Buffer): Promise<VercelFile> {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content
    const sha = crypto.createHash('sha1').update(buffer).digest('hex')
    const size = buffer.length

    const url = new URL(`${this.baseUrl}/v2/files`)
    if (this.teamId) url.searchParams.set('teamId', this.teamId)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'x-vercel-digest': sha,
      },
      body: buffer,
    })

    if (!response.ok) {
      // 200 또는 409 (이미 업로드됨) 모두 성공으로 처리
      const status = response.status
      if (status !== 200 && status !== 409) {
        throw new Error(`File upload failed: ${response.statusText}`)
      }
    }

    return { file: '', sha, size }  // file 경로는 배포 시 지정
  }

  // 2단계: 배포 생성
  async createDeployment(
    projectName: string,
    files: { path: string; content: string }[],
    envVars?: Record<string, string>,
  ): Promise<{ url: string; deploymentId: string }> {
    // 모든 파일 업로드
    const uploadedFiles: VercelFile[] = []
    for (const f of files) {
      const uploaded = await this.uploadFile(f.content)
      uploadedFiles.push({ ...uploaded, file: f.path })
    }

    const url = new URL(`${this.baseUrl}/v13/deployments`)
    if (this.teamId) url.searchParams.set('teamId', this.teamId)

    const body = {
      name: projectName,
      files: uploadedFiles,
      projectSettings: {
        framework: 'nextjs',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        nodeVersion: '20.x',
      },
      // 환경변수를 배포 시 인라인으로 포함 가능
      env: envVars
        ? Object.entries(envVars).map(([key, value]) => ({
            key,
            value,
            type: 'encrypted',
            target: ['production'],
          }))
        : undefined,
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Deployment creation failed: ${JSON.stringify(data)}`)
    }

    return {
      url: `https://${data.url}`,
      deploymentId: data.id,
    }
  }

  // 3단계: 프로젝트 환경변수 설정 (별도 API)
  async setEnvironmentVariables(
    projectId: string,
    envVars: Record<string, string>,
    target: ('production' | 'preview' | 'development')[] = ['production'],
  ): Promise<void> {
    const url = new URL(`${this.baseUrl}/v9/projects/${projectId}/env`)
    if (this.teamId) url.searchParams.set('teamId', this.teamId)
    url.searchParams.set('upsert', 'true')

    const envPayload = Object.entries(envVars).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target,
    }))

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envPayload),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(`Failed to set env vars: ${JSON.stringify(data)}`)
    }
  }

  // 배포 상태 폴링
  async waitForDeployment(deploymentId: string, maxWaitMs = 300000): Promise<string> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const url = `${this.baseUrl}/v13/deployments/${deploymentId}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
      })

      const data = await response.json()

      if (data.readyState === 'READY') {
        return `https://${data.url}`
      }

      if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
        throw new Error(`Deployment failed with state: ${data.readyState}`)
      }

      // 5초 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    throw new Error('Deployment timed out')
  }
}
```

#### 4.3 Deployment Agent 통합

```typescript
// deployment-agent.service.ts
@Injectable()
export class DeploymentAgentService {
  constructor(
    private readonly vercel: VercelDeploymentService,
    private readonly buildState: BuildStateService,
    private readonly progress: BuildProgressService,
  ) {}

  async deploy(buildId: string): Promise<string> {
    await this.progress.broadcastProgress(buildId, 'deployment', 'running')

    // Redis에서 이전 에이전트들의 결과 수집
    const frontendCode = await this.buildState.getAgentResult(buildId, 'frontend') as { files: { path: string; content: string }[] }
    const backendCode = await this.buildState.getAgentResult(buildId, 'backend') as { files: { path: string; content: string }[] }

    const allFiles = [
      ...frontendCode.files,
      ...backendCode.files,
    ]

    // Vercel 배포
    const { url, deploymentId } = await this.vercel.createDeployment(
      `yhai-${buildId}`,
      allFiles,
    )

    // 배포 완료 대기
    const finalUrl = await this.vercel.waitForDeployment(deploymentId)

    // Supabase에 배포 결과 저장
    await this.progress.broadcastProgress(buildId, 'deployment', 'completed', {
      url: finalUrl,
    })

    return finalUrl
  }
}
```

#### 4.4 Vercel 배포 플로우 다이어그램

```
Deployment Agent (NestJS Worker)
    │
    │ 1. 생성된 파일들 수집 (Redis에서)
    ▼
┌─────────────────────────────────────┐
│     POST /v2/files (파일 업로드)     │
│  body: Buffer content               │
│  header: x-vercel-digest: sha1      │
│  → 응답: 200 OK 또는 409 (중복)     │
└─────────────────────────────────────┘
    │ 업로드된 파일의 sha + size 수집
    ▼
┌─────────────────────────────────────┐
│  POST /v13/deployments (배포 생성)  │
│  body: {                            │
│    name: "yhai-{buildId}",          │
│    files: [{file, sha, size}],      │
│    projectSettings: {...}           │
│  }                                  │
│  → 응답: { id, url, readyState }   │
└─────────────────────────────────────┘
    │ deploymentId
    ▼
┌─────────────────────────────────────┐
│  GET /v13/deployments/{id} (폴링)  │
│  readyState: QUEUED                 │
│           → BUILDING                │
│           → READY ✓                 │
│           → ERROR ✗                 │
└─────────────────────────────────────┘
    │ 최종 URL
    ▼
┌─────────────────────────────────────┐
│  POST /v9/projects/{id}/env         │
│  (환경변수 설정, upsert=true)       │
└─────────────────────────────────────┘
    │
    ▼
Supabase Realtime → 사용자에게 URL 전달
```

---

### 5. 멀티테넌트 보안 아키텍처

#### 5.1 핵심 원칙

YHAI는 단일 Supabase 인스턴스에서 다수의 사용자 프로젝트를 운영하는 멀티테넌트 구조다. 데이터 격리는 Supabase RLS(Row Level Security)가 담당한다.

**보안 레이어:**
1. Supabase Auth → JWT 기반 사용자 식별
2. RLS 정책 → 데이터베이스 레벨 격리
3. API Key 관리 → 외부 서비스 접근 제어
4. CORS + 미들웨어 → 네트워크 레벨 보호

#### 5.2 데이터베이스 스키마 및 RLS 정책

```sql
-- 프로젝트 테이블
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  deploy_url  TEXT,
  vercel_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 (RLS 정책 성능 최적화 필수)
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 프로젝트만 조회
CREATE POLICY "users_select_own_projects"
ON projects FOR SELECT
TO authenticated
USING ( (SELECT auth.uid()) = user_id );

-- INSERT: 본인 user_id로만 생성
CREATE POLICY "users_insert_own_projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK ( (SELECT auth.uid()) = user_id );

-- UPDATE: 본인 프로젝트만 수정
CREATE POLICY "users_update_own_projects"
ON projects FOR UPDATE
TO authenticated
USING ( (SELECT auth.uid()) = user_id )
WITH CHECK ( (SELECT auth.uid()) = user_id );

-- DELETE: 본인 프로젝트만 삭제
CREATE POLICY "users_delete_own_projects"
ON projects FOR DELETE
TO authenticated
USING ( (SELECT auth.uid()) = user_id );
```

```sql
-- 빌드 이벤트 테이블
CREATE TABLE build_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  status     TEXT NOT NULL,
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_build_events_build_id ON build_events(build_id);

ALTER TABLE build_events ENABLE ROW LEVEL SECURITY;

-- 빌드 이벤트는 프로젝트 소유자만 조회 가능 (JOIN으로 소유권 확인)
CREATE POLICY "users_select_own_build_events"
ON build_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = build_events.build_id
    AND projects.user_id = (SELECT auth.uid())
  )
);

-- INSERT는 service_role만 가능 (NestJS 서버에서만 삽입)
-- authenticated 사용자에게 INSERT 정책 없음 = 불가
```

```sql
-- 사용자 API 키 저장 테이블 (암호화된 외부 서비스 키)
CREATE TABLE user_api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service     TEXT NOT NULL,    -- 'vercel', 'github', 'openai' 등
  key_hash    TEXT NOT NULL,    -- 실제 키는 암호화하여 저장
  key_preview TEXT NOT NULL,    -- 마지막 4자리만 표시용
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_api_keys_unique ON user_api_keys(user_id, service);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_api_keys"
ON user_api_keys FOR ALL
TO authenticated
USING ( (SELECT auth.uid()) = user_id )
WITH CHECK ( (SELECT auth.uid()) = user_id );
```

#### 5.3 서비스 역할 키 관리

```typescript
// 서버 전용 Supabase Admin 클라이언트
// 절대 클라이언트 코드에 노출 금지
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

// service_role 키는 RLS를 우회하므로 신중하게 사용
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // 서버 환경변수
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

```typescript
// NestJS에서 API 키 암호화 저장
import { Injectable } from '@nestjs/common'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

@Injectable()
export class ApiKeyService {
  private readonly encryptionKey = process.env.ENCRYPTION_KEY!  // 32바이트 키

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return `${iv.toString('hex')}:${encrypted}`
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  async storeApiKey(userId: string, service: string, apiKey: string): Promise<void> {
    const keyHash = this.encrypt(apiKey)
    const keyPreview = `...${apiKey.slice(-4)}`

    await supabaseAdmin
      .from('user_api_keys')
      .upsert({
        user_id: userId,
        service,
        key_hash: keyHash,
        key_preview: keyPreview,
      }, {
        onConflict: 'user_id,service',
      })
  }

  async getApiKey(userId: string, service: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('user_api_keys')
      .select('key_hash')
      .eq('user_id', userId)
      .eq('service', service)
      .single()

    if (!data) return null
    return this.decrypt(data.key_hash)
  }
}
```

#### 5.4 Upstash Redis Rate Limiting (API 남용 방지)

```typescript
// middleware.ts에서 API 요청 속도 제한
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse, type NextRequest } from 'next/server'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),  // 분당 10회
  analytics: true,
})

export async function middleware(request: NextRequest) {
  // API 경로에만 속도 제한 적용
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success, limit, remaining, reset } = await ratelimit.limit(ip)

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }
  }

  // ... Supabase 세션 갱신 로직
}
```

#### 5.5 멀티테넌트 보안 아키텍처 다이어그램

```
사용자 A                              사용자 B
    │                                     │
    │ JWT (user_id: A)                    │ JWT (user_id: B)
    ▼                                     ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Middleware                          │
│  Rate Limiting (Upstash) + Session Refresh (Supabase)   │
└─────────────────────────────────────────────────────────┘
    │                                     │
    ▼                                     ▼
┌───────────────────────┐   ┌───────────────────────────┐
│  Server Components /  │   │  Server Components /       │
│  Server Actions       │   │  Server Actions            │
│  supabase.auth.getUser│   │  supabase.auth.getUser     │
│  → user_id = A        │   │  → user_id = B             │
└───────────┬───────────┘   └───────────┬───────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL                      │
│                                                          │
│  projects 테이블                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  id  │ user_id │ name     │ status              │    │
│  ├─────────────────────────────────────────────────┤    │
│  │  1   │    A    │ "Shop A" │ ready    ← A만 접근 │    │
│  │  2   │    B    │ "Blog B" │ building ← B만 접근 │    │
│  │  3   │    A    │ "Blog A" │ pending  ← A만 접근 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  RLS Policy: using( auth.uid() = user_id )              │
│  → 사용자 A는 id=1,3만 조회 가능                         │
│  → 사용자 B는 id=2만 조회 가능                           │
└─────────────────────────────────────────────────────────┘
            │
            │ service_role (RLS 우회)
            ▼
┌─────────────────────────────────────────────────────────┐
│              NestJS Workers (서버 내부)                  │
│  supabaseAdmin (service_role key)                        │
│  → 빌드 이벤트 INSERT, 배포 결과 UPDATE                  │
│  → 클라이언트에 절대 노출 금지                            │
└─────────────────────────────────────────────────────────┘
```

---

## 경쟁사/기술 비교표

### 실시간 통신 방식 비교

| 방식 | 프로토콜 | 방향 | Vercel 지원 | 재연결 | 주요 사용 사례 |
|------|---------|------|------------|--------|--------------|
| SSE | HTTP | 단방향 (서버→클라이언트) | 완벽 | 자동 | AI 스트리밍, 빌드 로그 |
| WebSocket | TCP | 양방향 | 제한적 | 수동 | 실시간 협업, 게임 |
| Supabase Realtime | WebSocket + Phoenix | 양방향 | 완벽 (외부) | 자동 | DB 변경 구독, Presence |
| Long Polling | HTTP | 단방향 | 완벽 | 수동 | 레거시, 단순 알림 |

### 메시지 큐 비교

| 솔루션 | 런타임 | 지속성 | 우선순위 | 부모-자식 작업 | 사용 적합성 |
|--------|--------|--------|----------|--------------|------------|
| BullMQ + Upstash | Node.js | 영구 | 지원 | 지원 | YHAI 최적 |
| AWS SQS | 모든 언어 | 영구 | 제한적 | 미지원 | 오버스펙 |
| RabbitMQ | 모든 언어 | 영구 | 지원 | 지원 | 인프라 부담 |
| Inngest | Serverless | 영구 | 지원 | 지원 | Vercel 환경 대안 |

---

## YHAI에 대한 시사점

### 아키텍처 권장사항

1. **인증 레이어**: `@supabase/ssr`의 `createServerClient` + 미들웨어 세션 갱신 패턴을 그대로 채택. `getSession()` 대신 반드시 `getUser()` 사용.

2. **에이전트 오케스트레이션**: NestJS + BullMQ(Upstash Redis) 조합으로 에이전트 태스크 큐 구성. 위상 정렬로 의존성 관리, Redis Hash로 에이전트 간 결과 공유.

3. **스트리밍 이중 채널**: AI 대화 응답은 SSE(Next.js Route Handler → ReadableStream), 빌드 진행상황은 Supabase Realtime(Broadcast)으로 분리 운영.

4. **Vercel 배포 자동화**: 파일 SHA1 업로드 → 배포 생성 → 상태 폴링 3단계 플로우. 환경변수는 `/v9/projects/{id}/env` API로 upsert.

5. **보안**: RLS 정책에서 `(SELECT auth.uid()) = user_id` 패턴 사용 (함수 호출 캐싱으로 성능 최적화). `service_role` 키는 NestJS 서버에서만, 외부 API 키는 AES-256 암호화 후 저장.

6. **Rate Limiting**: `@upstash/ratelimit`을 Next.js 미들웨어에 통합하여 API 남용 방지. Sliding Window 알고리즘 권장.

7. **파일 락**: 멀티 에이전트가 동일 파일을 동시에 수정하지 않도록 Redis SET NX(원자적 락) 사용.

### 주의사항

- Vercel Serverless Functions는 WebSocket을 지원하지 않음 → 반드시 SSE 또는 외부 WebSocket 서비스 사용
- Supabase `service_role` 키가 클라이언트에 노출되면 모든 RLS 정책이 무력화됨
- BullMQ의 부모-자식 작업 계층 구조를 활용하면 에이전트 의존성 관리가 단순화됨
- Claude API 스트리밍은 `content_block_delta` 이벤트의 `text_delta`를 소비하는 방식으로 구현

---

## 참고 자료

- [Setting up Server-Side Auth for Next.js | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Realtime Architecture | Supabase Docs](https://supabase.com/docs/guides/realtime/architecture)
- [Upload Deployment Files | Vercel REST API](https://vercel.com/docs/rest-api/deployments/upload-deployment-files)
- [Create a new deployment | Vercel REST API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment)
- [Streaming Messages - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Using BullMQ with NestJS for Background Job Processing | Medium](https://mahabub-r.medium.com/using-bullmq-with-nestjs-for-background-job-processing-320ab938048a)
- [Multi-Agent Orchestration: Running 10+ Claude Instances in Parallel | DEV Community](https://dev.to/bredmond1019/multi-agent-orchestration-running-10-claude-instances-in-parallel-part-3-29da)
- [Using SSE to stream LLM responses in Next.js | Upstash Blog](https://upstash.com/blog/sse-streaming-llm-responses)
- [Enforcing Row Level Security in Supabase: Multi-Tenant Architecture | DEV Community](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Multi-Tenant Applications with RLS on Supabase | AntStack Blog](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [WebSocket vs SSE vs Long Polling: Choosing Real-time in 2025 | potapov.me](https://potapov.me/en/make/websocket-sse-longpolling-realtime)
- [Scaling NestJS Applications with BullMQ and Redis | Medium](https://medium.com/@kumarasinghe.it/scaling-nestjs-applications-with-bullmq-and-redis-a-deep-dive-into-background-job-processing-ce6b6fb5017f)
- [Claude Agent SDK Best Practices | Skywork.ai](https://skywork.ai/blog/claude-agent-sdk-best-practices-ai-agents-2025/)

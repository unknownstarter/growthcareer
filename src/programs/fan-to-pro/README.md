# /src/programs/fan-to-pro — Clean Architecture

PRD에 명시된 4-layer 구조. 의존 방향은 안쪽으로만 (`presentation → application → domain`, `infrastructure → domain`).

```
domain/          순수 비즈니스 (엔티티, 값 객체, 규칙). 외부 의존 0.
application/     유스케이스. domain 사용. infrastructure 는 인터페이스로만 의존.
infrastructure/  Supabase, 외부 API 어댑터. domain/application 의 인터페이스 구현.
presentation/    React 컴포넌트, 섹션, UI. application 만 호출.
  sections/      Hero, Problem, Solution, ... 10개
  components/    StickyCTA, ApplyForm, ...
  ui/            Button, Input, Card 등 atomic
```

라우트(`app/fan-to-pro/page.tsx`)는 얇게 — `presentation` 의 컴포넌트를 조립만.

# WebGL 유리 굴절 히어로 만드는 법 (원티드식 liquid glass)

> 원티드 커리어 캠프 히어로(글로시 오브젝트 + 큰 타이포 + 굴절/색분산)를 코드로 재현하는 방법. 2026-09-21 습득.
> 산출물 예시: `docs/design/captures/fantopro-glass-hero.png`. 렌더 소스: `docs/design/glass-hero-render.html`.

---

## 0. 가장 중요한 발견 (먼저 읽기)

**원티드 히어로는 라이브 WebGL이 아니라 정적 PNG 이미지다.** 페이지 검사 결과 canvas/three/spline/webgl 전부 없음, `static.wanted.co.kr/.../F4hAJ1cH.png` (2120x1290) 같은 큰 이미지만 박혀 있음. 즉 **3D 툴(Blender)에서 오프라인 렌더 → PNG로 구워서 `<img>`로 삽입**한 것.

교훈: **시각 효과를 재현하기 전에 레퍼런스가 실제로 어떻게 구현됐는지부터 검사하라** (DOM/asset/canvas). 이걸 안 하고 라이브 2D 필터(SVG)로 흉내내다 여러 번 헛발질함. [[lesson 2026-09-21]]

→ 그래서 우리도 **Three.js로 씬을 짜서 Playwright 헤드리스로 고해상 PNG를 굽는다** (원티드와 같은 "정적 베이킹" 방식이되 코드로 통제).

---

## 1. 레시피 (Three.js)

핵심 5요소:

1. **씬 + 환경맵** - `PMREMGenerator.fromScene(new RoomEnvironment())` → `scene.environment`. 이게 유리 표면의 흰 반사 스트릭을 만든다. 배경색은 `#14191E`(원티드 톤).
2. **텍스트 백드롭 평면** - 2D 캔버스에 흰 텍스트(bg 동일색) 그려서 `CanvasTexture` → `PlaneGeometry` + `MeshBasicMaterial`. z=0 에 놓고 카메라 시야를 꽉 채우게 사이즈.
3. **유리 오브젝트** - `RoundedBoxGeometry`(키캡 근사) + `MeshPhysicalMaterial`:
   ```js
   transmission:1,       // 투과 = 뒤 텍스트가 굴절돼 보임
   ior:1.45, thickness:1.3,
   roughness:0.04, clearcoat:1, clearcoatRoughness:0.04,  // 하이글로스
   envMapIntensity:1.8,
   color:'#b7c0cc',      // ⚠️ 맑은 유리 (아래 함정 참조)
   attenuationColor:'#5b6470', attenuationDistance:6.5     // 살짝 다크 틴트
   ```
   유리는 텍스트 평면 앞(z≈1.7), 3/4 뷰로 회전(`rotation.set(0.46,0.38,0.66)`).
4. **라이트** - 환경맵 + `DirectionalLight` 1~2개로 하드 하이라이트.
5. **색분산 포스트** - `EffectComposer` + `RenderPass` + `ShaderPass`(방사형 RGB 오프셋):
   ```glsl
   vec2 d=(vUv-0.5); float r=texture2D(t,vUv+d*uAmt).r; float g=texture2D(t,vUv).g; float b=texture2D(t,vUv-d*uAmt).b;
   ```
   `uAmt≈0.005`. (⚠️ §6.8: 색분산=색번짐 금지 대상. 히어로 한정 예외로만, 또는 0으로.)

---

## 2. 헤드리스 베이킹 (Playwright)

```js
const b = await chromium.launch({ args:["--use-gl=angle","--use-angle=swiftshader","--ignore-gpu-blocklist"] }); // WebGL 필수 플래그
// file:// 로 렌더 HTML 열기 → window.__ready 대기 → canvas.toDataURL('image/png') → PNG 저장
```
- Three.js/addons 는 렌더 HTML 안에서 unpkg CDN import (Playwright는 네트워크 OK).
- `WebGLRenderer({preserveDrawingBuffer:true})` 여야 `toDataURL` 이 픽셀을 준다.
- 출력은 `docs/design/captures/` (pnpm preview wipe 회피).

---

## 3. 함정 (직접 부딪힌 것들)

| 함정 | 증상 | 해결 |
|---|---|---|
| GLSL 예약어 | `'flat' : syntax error` | 셰이더 변수명에 `flat` 쓰지 말 것 |
| **다크 유리 = 투과 죽음** | 검은 아크릴처럼 렌더돼 뒤 글자 안 비침 | **맑은 유리(밝은 color + 긴 attenuationDistance)로 투과부터 살리고**, 톤은 `attenuationColor`로 살짝만 어둡게 |
| 오브젝트 과대 | 화면을 다 덮음 | 카메라 거리 대비 크기 계산 (뷰 높이 = 2·dist·tan(fov/2)) |
| 정면 vs 기울기 | 정면=글자투과 / 기울기=반사스트릭. 둘 다 원함 | 큰 윗면이 카메라 쪽으로 살짝 기운 3/4 뷰 + 텍스트 평면을 유리에 가깝게 |
| WebGL 헤드리스 | 렌더 검게/빈화면 | launch args 에 `--use-gl=angle --use-angle=swiftshader` |
| Artifact CSP | three CDN 로드 차단 | **정적 PNG로 구워서 `<img>`** (원티드와 동일). 라이브 R3F는 실제 Next 사이트에서만 |

---

## 4. 우리 것으로 커스터마이즈

- **텍스트**: 캔버스 `fillText` 만 교체 ("Fan to Pro" 등)
- **오브젝트**: `RoundedBoxGeometry` → K-엔터 오브젝트로 교체 가능 (바이닐=납작 실린더, 페이더, 헤드폰 등). 유리 재질은 그대로.
- **톤/색분산/각도**: 위 파라미터만 조절 후 재베이킹.
- **실제 사이트 라이브 버전**(원하면): Next.js 에 `three`+`@react-three/fiber`+`@react-three/drei` 설치, `MeshTransmissionMaterial`(chromaticAberration 속성 내장) 사용. 단 번들 +1MB, 모바일 폴백 필요.

## 5. 레퍼런스

- drei `MeshTransmissionMaterial`: https://blog.olivierlarose.com/tutorials/3d-glass-effect
- Refraction/dispersion 셰이더: https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/
- Codrops 유리 안 텍스트: https://tympanus.net/codrops/2025/03/13/warping-3d-text-inside-a-glass-torus/
- 원티드 히어로 분석: `docs/design/fantopro-design-reference.md`

/**
 * verify_token 생성기 (B0081, 2026-07-19).
 *
 * 목적: verify URL 에 노출될 opaque 10자 토큰. serial_no 는 UI 표기 전용이라
 * URL 노출 시 기수·순번 유출 신호가 되므로 별도 토큰으로 분리.
 *
 * 알파벳: A-Za-z0-9 (URL-safe, 하이픈/언더스코어 제외 시각 노이즈 감소).
 * 길이: 10자.
 *
 * 충돌 확률 (bday paradox):
 *   - 알파벳 62^10 ~= 8.4 x 10^17.
 *   - 1만 발급 시 충돌 확률 ~= 5.9 x 10^-11. 사실상 0.
 *   - 그럼에도 DB UNIQUE 제약이 안전망 (INSERT 실패 시 상위 계층에서 retry).
 *
 * customAlphabet 은 nanoid 6 의 module-level API. secure random 사용.
 */
import { customAlphabet } from "nanoid";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const LENGTH = 10;

const generator = customAlphabet(ALPHABET, LENGTH);

/**
 * verify_token 1개 생성.
 *
 * 무작위성: crypto.randomBytes 기반 (Node.js 24 LTS).
 */
export function generateVerifyToken(): string {
  return generator();
}

/**
 * verify_token 형식 검증 (URL param 에서 유입 시 사전 필터).
 *
 * hex 백필 row (16자) 도 통과시켜야 하므로 6~16자 alphanumeric.
 * 강한 검증은 아니고 명백한 이상값 (`../`, script 등) 을 배제하는 boundary.
 */
export function isPlausibleVerifyToken(input: string): boolean {
  return /^[A-Za-z0-9]{6,16}$/.test(input);
}

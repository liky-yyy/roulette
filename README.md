# Roulette Replay

구슬 물리 룰렛의 **과정과 결과를 URL로 공유할 수 있도록** 수정한 버전입니다.

원본 프로젝트는 [Marble Roulette by lazygyu](https://github.com/lazygyu/roulette)를 기반으로 하며, 이 저장소는 원본과 별개의 포크/변형 프로젝트입니다.

## 핵심 기능

- 참가자 목록을 URL에 저장
- 난수 seed를 URL에 저장
- 구슬 배치, 물리 랜덤값, 스킬/흔들림 랜덤값을 seeded PRNG로 재현
- 맵, 스킬 사용 여부, 당첨 순위 설정을 URL에 함께 저장
- `🔗 결과 URL` 버튼으로 현재 룰렛을 공유
- 공유 URL을 연 사람은 같은 seed와 설정으로 동일한 라운드를 재생
- GitHub Pages에서 별도 서버/DB 없이 동작

예시 URL 형식:

```text
https://liky-yyy.github.io/roulette/?seed=abc123&names=A,B,C,D&map=0&skills=1&winner=first
```

> 브라우저/CPU/WASM 구현 차이까지 포함한 장기적인 비트 단위 동일성을 보장하는 녹화 재생 방식은 아닙니다. 같은 빌드와 일반적인 최신 브라우저 환경에서는 동일한 입력과 난수열을 사용해 같은 물리 라운드를 재현하는 것을 목표로 합니다.

## 사용법

1. 참가자 이름을 입력합니다.
2. 맵, 스킬, 당첨 순위를 설정합니다.
3. 필요하면 `Shuffle`로 새로운 seed/배치를 만듭니다.
4. `🔗 결과 URL`을 눌러 URL을 복사합니다.
5. 복사한 URL을 다른 사람에게 전달합니다.
6. 상대방은 해당 URL에서 같은 설정과 seed로 룰렛을 실행할 수 있습니다.

## Requirements

- TypeScript
- Parcel
- box2d-wasm

## Development

```shell
yarn
yarn dev
```

## Build

```shell
yarn build
```

## Deploy

저장소의 GitHub Actions Pages workflow를 사용합니다. `main` 브랜치에 반영된 뒤 Pages 설정이 GitHub Actions를 사용하도록 되어 있으면 자동 배포됩니다.

## 구현 방식

결과를 미리 정해서 보여주는 방식이 아니라 실제 룰렛 물리는 그대로 실행합니다. 대신 라운드에 영향을 주는 난수 스트림을 URL의 `seed`에서 생성합니다.

설정 단계와 실행 단계의 난수 스트림을 분리해 광고/UI 코드가 중간에 난수를 소비하더라도 실제 게임 진행 난수열이 달라지지 않도록 구성했습니다.

## License / attribution

Source code is licensed under the [MIT License](./LICENSE).

The original source code is based on Marble Roulette by lazygyu. `Marble Roulette` / `마블 룰렛` 명칭은 원 저작자의 상표 안내 대상이므로 이 변형 프로젝트의 제품명/브랜딩으로 사용하지 않습니다.

# xatlas UV 펼치기

편집기의 UV 자동 펼치기에서만 `xatlas-wasm` 0.1.3을 분리 Worker로 로드하고 종료 시 해제해요. 실행 게임에는 로드하지 않아요.

- 원본 xatlas: https://github.com/jpcy/xatlas · MIT · 저작권/허가는 xatlas.txt에 보존
- JavaScript/WASM 바인딩: https://github.com/mode777/xatlas-wasm · 배포 package.json에 MIT 선언
- 패키지: https://registry.npmjs.org/xatlas-wasm/-/xatlas-wasm-0.1.3.tgz
- 고정 버전과 배포 무결성은 package-lock.json에 보존

패키지의 WASM이 포함된 단일 ESM은 288,718바이트예요. 게임 실행용 렌더러 의존성이 아닌 편집용 자원이에요.

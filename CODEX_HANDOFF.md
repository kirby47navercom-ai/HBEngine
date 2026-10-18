# HBEngine 인계 — 371–376 구현·검증, 설치370 유지

- 계속 작업 중이에요. 사용자 목표는 누적 엔진 전체이며 이 묶음으로 끝내지 않아요. 다음은 RND05 전역 곡면/변경 경로 대응과 RND06 준비 비용, 다른 원장 세부예요. 전체 Unreal/Unity 분석·엔진 완료율은 미확정이에요.
- 현재 설치370 1e50e6754649e3e1/3183/Versions1, USER_INSTALL_370 정본. HEAD0b1ff16 이후371–376 구현을 커밋/푸시하고 새376 설치할 단계예요. record/sync/install/finish370 및365/349/334/327/318 one-shot 재실행 금지예요. 새376 이름을 사용해요.
- 독립 이전 IOR 스택: path-media-gpu의 기존 seed/change 재사용·고유 Fn prefix·old IDs16+scalar IOR16·lazy first-glass seed·별도 absolute prior time/old BVH. 현재 RGB extinction 유지·thin disabled 배열 제외. old physical0 단일 평가/oldEta/oldDirection 보존·entry/nonLIFO exit/TIR·앞뒷면·unknown/overflow/incomplete failclosed·다음 old ray가 mapped point를 실제 지나는지 확인해요. 글로벌 역해를 해결한 것으로 세지 않아요.
- 기존 radiance integrator와 같은 국소 ratio/cosine cone 갱신을 current/prior guide에 연결했어요. reflection/TIR 유지·.01 floor/1.57cap. full curved/anisotropic/rough/참여매질 footprint는 별도예요.
- 371 최종 trQwz9 GL/GPU20조건·96XWjM DX10조건: old/current nested IOR와 current RGB 소광 보존. 373 t3DYw0 GL/GPU18·SORwne DX18 전이/독립Snell. 374 R67NZa 세GPU49퍼짐조건. 375 D1MErP GL/GPU·Y4iuc1 DX 전체guide독립width+실제normal-map mip/old-unbent 비교통과예요.
- 374뒤372최종0NagVH GL/GPU8조건/GkkVcM DX4조건: baseline0b1ff16의잘못된oldcamera-medium 이력을 새계산만거부·static유지. 369 X9UNA3 thin/직교/이전가림12조건 통과예요.
- 새desktop/player재빌드완료. 실제C++/BP145 source D3Dwy7K7b·WebGPUVOqQsx 통과·종료0/서버해제. 비통제전환DX4.81/4.91초,GPU4.13/2.62초는FPS/전후개선율아니에요. 이후PS/contract/doc/test전용변경이므로최종data sync만필요해요.
- 캐시376: 실제동시prune에서target dir가아직있는데내부PostDriver.h가다른프로세스에먼저삭제되는경쟁재현. build-root별namedmutex로파괴정리직렬화·획득후process재조회·abandoned소유회복/timeoutfail·finally해제. MlvQ3N 두실제PS프로세스부분삭제/대기통과·3708ylL5z 권한/부재4조건통과. 앞선 실패c1e45afc...result는성과가아니며보존해요.
- AI previousMedium/opticalSpread 불변계약·remaining갱신. native308 harness probeCount/dispatchCount/standalone은privateGPU kernel검사재사용이며legacy기본도371/372/375에서사용해요.
- supplemental376 PBRT4선택본문/SHA와미독연결등록. 전체corpus gate미승격. native/build/reference-corpus/supplemental376/read-scope.json 참조예요.
- 방해금지: hidden owned probe/private project/profile/ports만. activeInstalledVersions 전제·User읽기inventory만·원본게임/사용자프로세스 불변·Versions1·프로브/완성Build/프로필/중복Node는SHA/evidence후정리해요. no Mac/Xcode/Android기기 제한은실행검증에남아요.
- 한국어 커밋·author/committer kirby47navercom-ai / 228715038+kirby47navercom-ai@users.noreply.github.com·AI trailer없음·main push 유지예요.

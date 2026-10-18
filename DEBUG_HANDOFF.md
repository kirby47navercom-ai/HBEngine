# 현재 진단 — 설치415 검증 완료·좌표graph 416 조사

실제411 qC75cp에서좌표1천만/폭.3125의월드offset이F32에서0이되어GL/GPU가큰mip도원방향(-1,0,0)으로반환했어요. 상대삼각형모서리의affineUV차분뒤qk29SF와D3D9T3FyC에서큰mip중립/작은mip원방향이맞아요. 17pose/UV컨텍스트bg07Rp·zoaPe5도기존4e-5통과예요.

다음은중간좌표graph(특히큰수더하기/panner/월드위치)에대한실제재현이에요. 현재생성기는rX/Y를여전히이동한절대값으로보존하고마지막텍스처입력에서빼므로중간큰값에서차분이사라질수있어요. 아직제품수정/증거없으며적절한finite-difference기준과0미분texture좌표기존근사를보존해야해요. 전역곡면/매질과원장잔여유지.

411첫nativeQvH32p는helper의vec2(0)가HLSLscalarconstructor로변환안된문제였고vec2(0,0)로고쳤어요. 413EM15l0는RayPrograms단독include에서<algorithm>누락,생성원본에추가해ZL2gfn10cases통과. 원래실패는통과로계산하지않아요.

414mip정상graph GL준비한쌍2664.9→2576.6ms/source122B감소,415실제D3D게임9mIBhk path4615/시간guide4488ms는관찰값일뿐속도향상/RND06완료가아니에요. 이전334GLfactoring을그대로반복하지않아요. 410NaN실패jVnxjW52→최종0과native-materials선언수정은ENGINE_WORK410에보존해요.

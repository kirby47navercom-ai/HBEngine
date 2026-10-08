#pragma once
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <type_traits>
#include <limits>
#include <vector>
#include <nlohmann/json.hpp>

// Editor metadata; the prototype registration tool reads these declarations.
#define HB_CLASS(...)
#define HB_FUNCTION(...)
#define HB_NODE(...)
#define HB_PROPERTY(...)
namespace hb {
using Json=nlohmann::json;
struct Vec2 { float x=0,y=0; };
struct Vec3 { float x=0,y=0,z=0; };
struct Color { float r=1,g=1,b=1,a=1; };
struct Transform { Vec3 position{},rotation{},scale{1,1,1}; };
struct Library {};
struct Actor { Transform transform{}; virtual ~Actor()=default; };
struct HitResult { bool hit=false; Vec3 position{},normal{}; Actor* actor=nullptr; };
struct Component { Actor* actor=nullptr; virtual ~Component()=default; };
struct Pawn : Actor {};
struct Character : Pawn {};
struct Controller : Actor {};
struct PlayerController : Controller {};
struct GameMode : Actor {};
struct GameState : Actor {};
struct GameInstance : Actor { Json state=Json::object(); virtual void Init(){} virtual void Shutdown(){} };
struct PlayerState : Actor {};
struct AIController : Controller {};
struct SceneComponent : Component { Transform transform{}; };
HB_CLASS()
class Game : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getGameInstance", KoreanName="게임 인스턴스", Category="게임") static GameInstance* GetInstance();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="gameSessionId", KoreanName="게임 세션 ID", Category="게임") static std::string GetSessionId();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="gameStateRead", KoreanName="게임 상태 JSON 읽기", Category="게임") static std::string GetStateText();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="gameArgsRead", KoreanName="장면 인자 JSON 읽기", Category="게임") static std::string GetArgumentsText();
    static Json GetArguments(){return Json::parse(GetArgumentsText());}
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="gameStateWrite", KoreanName="게임 상태 JSON 지정", Category="게임") static void SetStateText(const std::string& json);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="gameReset", KoreanName="게임 새로 시작", Category="게임") static void Reset();
};
HB_CLASS()
class Save : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="saveJsonWrite", KoreanName="JSON 저장", Category="저장") static void WriteText(const std::string& slot,const std::string& json);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="saveJsonRead", KoreanName="JSON 저장 읽기", Category="저장") static std::string ReadText(const std::string& slot);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="saveJsonDelete", KoreanName="JSON 저장 삭제", Category="저장") static void Delete(const std::string& slot);
    static void Write(const std::string& slot,const Json& json){WriteText(slot,json.dump());}
    static Json Read(const std::string& slot){return Json::parse(ReadText(slot));}
};
HB_CLASS()
class Data : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="dataJsonRead", KoreanName="데이터 에셋 JSON", Category="데이터") static std::string GetText(const std::string& path);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="dataTableRead", KoreanName="데이터 표 행", Category="데이터") static std::string GetTableText(const std::string& path,const std::string& rowId);
    static Json Get(const std::string& path){return Json::parse(GetText(path));}
    static Json GetTable(const std::string& path,const std::string& rowId){return Json::parse(GetTableText(path,rowId));}
};
HB_CLASS()
class Audio : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="audioPlay", KoreanName="소리 재생", Category="오디오") static std::string Play(const std::string& asset,float volume=1.f,float pitch=1.f,const std::string& bus="sfx");
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="audioStop", KoreanName="소리 핸들 정지", Category="오디오") static void Stop(const std::string& handle);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="audioMusic", KoreanName="배경음 전환", Category="오디오") static void PlayMusic(const std::string& asset,float fadeSeconds=0.f);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="audioStopMusic", KoreanName="배경음 정지", Category="오디오") static void StopMusic(float fadeSeconds=0.f);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="audioPlayAt", KoreanName="위치 소리 재생", Category="오디오") static std::string PlayAt(const std::string& asset,const Vec3& position,float volume=1.f,float pitch=1.f,const std::string& bus="sfx");
};
HB_CLASS()
class Components : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetFloat", KoreanName="컴포넌트 수치 읽기", Category="컴포넌트") static float GetFloat(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetFloat", KoreanName="컴포넌트 수치 지정", Category="컴포넌트") static void SetFloat(Actor* target,const std::string& component,const std::string& property,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetBool", KoreanName="컴포넌트 논리값 읽기", Category="컴포넌트") static bool GetBool(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetBool", KoreanName="컴포넌트 논리값 지정", Category="컴포넌트") static void SetBool(Actor* target,const std::string& component,const std::string& property,bool value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetString", KoreanName="컴포넌트 문자열 읽기", Category="컴포넌트") static std::string GetString(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetString", KoreanName="컴포넌트 문자열 지정", Category="컴포넌트") static void SetString(Actor* target,const std::string& component,const std::string& property,const std::string& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetVector", KoreanName="컴포넌트 벡터 읽기", Category="컴포넌트") static Vec3 GetVector(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetVector", KoreanName="컴포넌트 벡터 지정", Category="컴포넌트") static void SetVector(Actor* target,const std::string& component,const std::string& property,const Vec3& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetColor", KoreanName="컴포넌트 색상 읽기", Category="컴포넌트") static Color GetColor(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetColor", KoreanName="컴포넌트 색상 지정", Category="컴포넌트") static void SetColor(Actor* target,const std::string& component,const std::string& property,const Color& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="componentGetJson", KoreanName="컴포넌트 JSON 읽기", Category="컴포넌트") static std::string GetText(Actor* target,const std::string& component,const std::string& property);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="componentSetJson", KoreanName="컴포넌트 JSON 지정", Category="컴포넌트") static void SetText(Actor* target,const std::string& component,const std::string& property,const std::string& json);
    static Json Get(Actor* target,const std::string& component,const std::string& property){return Json::parse(GetText(target,component,property));}
    static void Set(Actor* target,const std::string& component,const std::string& property,const Json& value){SetText(target,component,property,value.dump());}
};
HB_CLASS()
class Movement2D : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="movement2dSpeed", KoreanName="2D 이동 속도 지정", Category="2D 이동") static void SetSpeed(Actor* target,float speed);
};
HB_CLASS()
class Projectiles : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="projectileFire", KoreanName="투사체 패턴 발사", Category="투사체") static std::string FireText(const std::string& json);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="projectileHits", KoreanName="투사체 충돌 묶음", Category="투사체") static std::string TakeHitsText();
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="projectileClear", KoreanName="소유 투사체 정리", Category="투사체") static void Clear();
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="projectileOnHit", KoreanName="투사체 충돌 이벤트 등록", Category="투사체") static void OnHit(const std::string& eventName);
    static std::string Fire(const Json& pattern){return FireText(pattern.dump());}
    static Json TakeHits(){return Json::parse(TakeHitsText());}
};
HB_CLASS()
class Camera : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="cameraOrthoSize", KoreanName="카메라 직교 크기", Category="카메라") static void SetOrthoSize(Actor* target,float size);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="cameraFollow", KoreanName="카메라 따라가기", Category="카메라") static void Follow(Actor* target,Actor* subject);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="cameraShake", KoreanName="카메라 흔들기", Category="카메라") static void Shake(Actor* target,float intensity,float duration);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="screenFlash", KoreanName="화면 번쩍임", Category="카메라") static void Flash(const Color& color,float duration);
};
HB_CLASS()
class UI : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiShow", KoreanName="위젯 UI 표시", Category="UI") static void Show(Actor* target,const std::string& asset,const std::string& instance);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiRemove", KoreanName="위젯 UI 제거", Category="UI") static void Remove(Actor* target,const std::string& instance);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetText", KoreanName="위젯 텍스트 지정", Category="UI") static void SetText(Actor* target,const std::string& instance,const std::string& element,const std::string& text);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="uiGetText", KoreanName="위젯 텍스트 가져오기", Category="UI") static std::string GetText(Actor* target,const std::string& instance,const std::string& element);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetValue", KoreanName="위젯 값 지정", Category="UI") static void SetValue(Actor* target,const std::string& instance,const std::string& element,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="uiGetValue", KoreanName="위젯 값 가져오기", Category="UI") static float GetValue(Actor* target,const std::string& instance,const std::string& element);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetVisible", KoreanName="위젯 표시 상태", Category="UI") static void SetVisible(Actor* target,const std::string& instance,const std::string& element,bool visible);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetEnabled", KoreanName="위젯 활성 상태", Category="UI") static void SetEnabled(Actor* target,const std::string& instance,const std::string& element,bool enabled);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiFocus", KoreanName="위젯 입력 포커스", Category="UI") static void Focus(Actor* target,const std::string& instance,const std::string& element);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetTexture", KoreanName="위젯 그림 지정", Category="UI") static void SetTexture(Actor* target,const std::string& instance,const std::string& element,const std::string& texture);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetPosition", KoreanName="위젯 위치 지정", Category="UI") static void SetPosition(Actor* target,const std::string& instance,const std::string& element,const Vec2& position);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetSize", KoreanName="위젯 크기 지정", Category="UI") static void SetSize(Actor* target,const std::string& instance,const std::string& element,const Vec2& size);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetRotation", KoreanName="위젯 회전 지정", Category="UI") static void SetRotation(Actor* target,const std::string& instance,const std::string& element,float rotation);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetScale", KoreanName="위젯 배율 지정", Category="UI") static void SetScale(Actor* target,const std::string& instance,const std::string& element,const Vec2& scale);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetColor", KoreanName="위젯 색상 지정", Category="UI") static void SetColor(Actor* target,const std::string& instance,const std::string& element,const Color& color);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetOpacity", KoreanName="위젯 불투명도 지정", Category="UI") static void SetOpacity(Actor* target,const std::string& instance,const std::string& element,float opacity);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetFont", KoreanName="위젯 글꼴 지정", Category="UI") static void SetFont(Actor* target,const std::string& instance,const std::string& element,const std::string& font);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetFontSize", KoreanName="위젯 글자 크기", Category="UI") static void SetFontSize(Actor* target,const std::string& instance,const std::string& element,float fontSize);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiSetFillDirection", KoreanName="위젯 채우기 방향", Category="UI") static void SetFillDirection(Actor* target,const std::string& instance,const std::string& element,const std::string& direction);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="uiAnimate", KoreanName="위젯 간단 애니메이션", Category="UI") static void Animate(Actor* target,const std::string& instance,const std::string& element,const std::string& property,float to,float duration);
};
HB_CLASS()
class AudioMixer : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="mixerSet", KoreanName="믹서 파라미터 지정", Category="오디오") static void SetFloat(Actor* target,const std::string& asset,const std::string& parameter,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="mixerGet", KoreanName="믹서 파라미터 가져오기", Category="오디오") static float GetFloat(Actor* target,const std::string& asset,const std::string& parameter);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="mixerClear", KoreanName="믹서 파라미터 재정의 해제", Category="오디오") static void ClearFloat(Actor* target,const std::string& asset,const std::string& parameter);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="mixerSnapshot", KoreanName="믹서 스냅샷 전환", Category="오디오") static void TransitionTo(Actor* target,const std::string& asset,const std::string& snapshot,float duration);
};
// These services share the editor/game-world operation contract with Blueprint.
// The native host supplies the implementation and applies commands after each call.
HB_CLASS()
class Gameplay : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getGameMode", KoreanName="게임 모드 가져오기", Category="게임플레이") static Actor* GetGameMode();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getGameState", KoreanName="게임 상태 가져오기", Category="게임플레이") static Actor* GetGameState();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getPlayerController", KoreanName="플레이어 컨트롤러 가져오기", Category="게임플레이") static Actor* GetPlayerController();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getPlayerState", KoreanName="플레이어 상태 가져오기", Category="게임플레이") static Actor* GetPlayerState();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getPlayerPawn", KoreanName="플레이어 폰 가져오기", Category="게임플레이") static Actor* GetPlayerPawn();
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="possess", KoreanName="폰 제어권 연결", Category="게임플레이") static void Possess(Actor* controller,Actor* pawn);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="unPossess", KoreanName="폰 제어권 해제", Category="게임플레이") static void UnPossess(Actor* controller);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="addMovementInput", KoreanName="이동 입력 더하기", Category="게임플레이") static void AddMovementInput(Actor* target,const Vec3& direction,float scale);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="jump", KoreanName="캐릭터 점프", Category="게임플레이") static void Jump(Actor* target);
};
HB_CLASS()
class ActorPool : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="poolAcquire", KoreanName="재사용 오브젝트 꺼내기", Category="오브젝트 풀") static Actor* Acquire(const std::vector<Actor*>& pool,const Transform& transform);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="poolRelease", KoreanName="재사용 오브젝트 반환", Category="오브젝트 풀") static void Release(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="poolActive", KoreanName="재사용 오브젝트 활성 상태", Category="오브젝트 풀") static bool IsActive(Actor* target);
};
HB_CLASS()
class Input : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputLastDevice", KoreanName="최근 입력 장치", Category="입력") static std::string GetLastDevice();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputAnyPressed", KoreanName="아무 입력 눌림", Category="입력") static bool AnyKeyPressed();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputJustPressed", KoreanName="이번 프레임 눌림", Category="입력") static bool WasPressedThisFrame(const std::string& key);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputJustReleased", KoreanName="이번 프레임 해제", Category="입력") static bool WasReleasedThisFrame(const std::string& key);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputKeyDown", KoreanName="키·마우스 버튼 눌림", Category="입력") static bool IsKeyDown(const std::string& key);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="inputAxisValue", KoreanName="입력 축 값 가져오기", Category="입력") static float GetAxis(const std::string& key);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="actionValue", KoreanName="입력 액션 값", Category="입력 액션") static Vec3 GetActionValue(Actor* target,const std::string& action);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="actionState", KoreanName="입력 액션 상태", Category="입력 액션") static std::string GetActionState(Actor* target,const std::string& action);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="actionEvent", KoreanName="입력 액션 이벤트 여부", Category="입력 액션") static bool HasActionEvent(Actor* target,const std::string& action,const std::string& event);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="actionElapsed", KoreanName="입력 액션 유지 시간", Category="입력 액션") static float GetActionElapsed(Actor* target,const std::string& action);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="inputAddContext", KoreanName="입력 컨텍스트 추가", Category="입력 액션") static void AddMappingContext(Actor* target,const std::string& context,int priority=0);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="inputRemoveContext", KoreanName="입력 컨텍스트 제거", Category="입력 액션") static void RemoveMappingContext(Actor* target,const std::string& context);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="mousePosition", KoreanName="마우스 위치 가져오기", Category="입력") static bool GetMousePosition(Vec2& position);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="mouseDelta", KoreanName="마우스 이동량 가져오기", Category="입력") static Vec2 GetMouseDelta();
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="mouseRay", KoreanName="마우스 월드 방향 가져오기", Category="입력") static bool DeprojectMousePositionToWorld(Vec3& origin,Vec3& direction);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="mouseWorldPlane", KoreanName="마우스 조준 평면 위치", Category="입력") static bool GetMouseWorldPosition(const Vec3& normal,const Vec3& point,Vec3& position);
};
HB_CLASS()
class Sprites : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteFlash", KoreanName="스프라이트 피격 번쩍임", Category="2D 스프라이트") static void Flash(Actor* target,float duration,float strength=1);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spritePlayAnimation", KoreanName="스프라이트 애니메이션 재생", Category="2D 스프라이트") static void PlayAnimation(Actor* target,const std::string& asset,bool loop=true);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetLighting", KoreanName="스프라이트 2D·3D 광원 모드", Category="2D 조명") static void SetLightingMode(Actor* target,const std::string& mode);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetLighting", KoreanName="스프라이트 광원 모드 조회", Category="2D 조명") static std::string GetLightingMode(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteFlip", KoreanName="스프라이트 좌우·상하 반전", Category="2D 스프라이트") static void SetFlip(Actor* target,bool flipX,bool flipY);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetFlip", KoreanName="스프라이트 반전 가져오기", Category="2D 스프라이트") static void GetFlip(Actor* target,bool& flipX,bool& flipY);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSet", KoreanName="스프라이트 지정", Category="2D 스프라이트") static void SetSprite(Actor* target,const std::string& sprite);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGet", KoreanName="스프라이트 가져오기", Category="2D 스프라이트") static std::string GetSprite(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetColor", KoreanName="스프라이트 색상 지정", Category="2D 스프라이트") static void SetColor(Actor* target,const Color& color);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetColor", KoreanName="스프라이트 색상 가져오기", Category="2D 스프라이트") static Color GetColor(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetSize", KoreanName="스프라이트 크기 지정", Category="2D 스프라이트") static void SetSize(Actor* target,const Vec2& size);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetSize", KoreanName="스프라이트 설정 크기 가져오기", Category="2D 스프라이트") static Vec2 GetSize(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetSorting", KoreanName="스프라이트 정렬 지정", Category="2D 스프라이트") static void SetSorting(Actor* target,const std::string& layer,int order);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetSorting", KoreanName="스프라이트 정렬 가져오기", Category="2D 스프라이트") static void GetSorting(Actor* target,std::string& layer,int& order);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetMask", KoreanName="스프라이트 마스크 지정", Category="2D 스프라이트") static void SetMaskInteraction(Actor* target,const std::string& mode);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetMask", KoreanName="스프라이트 마스크 가져오기", Category="2D 스프라이트") static std::string GetMaskInteraction(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetLit", KoreanName="스프라이트 광원 적용", Category="2D 스프라이트") static void SetLit(Actor* target,bool lit);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteIsLit", KoreanName="스프라이트 광원 적용 여부", Category="2D 스프라이트") static bool IsLit(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetBlend", KoreanName="스프라이트 표면 혼합 지정", Category="2D 스프라이트") static void SetBlendMode(Actor* target,const std::string& mode,float alphaCutoff=.5f);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetBlend", KoreanName="스프라이트 표면 혼합 가져오기", Category="2D 스프라이트") static std::string GetBlendMode(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetAlphaCutoff", KoreanName="스프라이트 알파 기준 가져오기", Category="2D 스프라이트") static float GetAlphaCutoff(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetNormal", KoreanName="스프라이트 노멀맵 지정", Category="2D 스프라이트") static void SetNormalMap(Actor* target,const std::string& texture,float strength=1.f,bool flipY=false);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetNormal", KoreanName="스프라이트 노멀맵 설정 가져오기", Category="2D 스프라이트") static void GetNormalMap(Actor* target,std::string& texture,float& strength,bool& flipY);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetLightMask", KoreanName="스프라이트 2D 조명 마스크 지정", Category="2D 스프라이트") static void SetLightMaskTexture(Actor* target,const std::string& texture);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetLightMask", KoreanName="스프라이트 2D 조명 마스크 조회", Category="2D 스프라이트") static std::string GetLightMaskTexture(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="spriteSetShadows", KoreanName="스프라이트 그림자 지정", Category="2D 스프라이트") static void SetShadows(Actor* target,bool cast,bool receive);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="spriteGetShadows", KoreanName="스프라이트 그림자 설정 가져오기", Category="2D 스프라이트") static void GetShadows(Actor* target,bool& cast,bool& receive);
};

using Sprite = Sprites;
HB_CLASS()
class Light2D : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetCookieSprite", KoreanName="2D 광원 스프라이트 지정", Category="2D 조명") static void SetCookieSprite(Actor* target,const std::string& sprite);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetCookieSprite", KoreanName="2D 광원 스프라이트 조회", Category="2D 조명") static std::string GetCookieSprite(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetCookieTexture", KoreanName="2D 광원 텍스처 지정", Category="2D 조명") static void SetCookieTexture(Actor* target,const std::string& texture,float width,float height);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetCookieTexture", KoreanName="2D 광원 텍스처 조회", Category="2D 조명") static std::string GetCookieTexture(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetCookieSize", KoreanName="2D 광원 텍스처 크기 조회", Category="2D 조명") static void GetCookieSize(Actor* target,float& width,float& height);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetVolume", KoreanName="2D 볼륨 빛 지정", Category="2D 조명") static void SetVolumetric(Actor* target,bool enabled,float intensity,float shadowStrength);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetVolume", KoreanName="2D 볼륨 빛 조회", Category="2D 조명") static void GetVolumetric(Actor* target,bool& enabled,float& intensity,float& shadowStrength);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetOrder", KoreanName="2D 광원 순서 지정", Category="2D 조명") static void SetLightOrder(Actor* target,int order);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetOrder", KoreanName="2D 광원 순서 조회", Category="2D 조명") static int GetLightOrder(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetOverlap", KoreanName="2D 광원 겹침 처리 지정", Category="2D 조명") static void SetOverlapOperation(Actor* target,const std::string& mode);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetOverlap", KoreanName="2D 광원 겹침 처리 조회", Category="2D 조명") static std::string GetOverlapOperation(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetBlendStyle", KoreanName="2D 광원 블렌드 스타일 지정", Category="2D 조명") static void SetBlendStyle(Actor* target,int index);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetBlendStyle", KoreanName="2D 광원 블렌드 스타일 조회", Category="2D 조명") static int GetBlendStyle(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dRendererSetStyle", KoreanName="2D 렌더러 블렌드 스타일 설정", Category="2D 조명") static void SetRendererBlendStyle(Actor* target,int index,const std::string& mode,const std::string& mask);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dRendererGetStyle", KoreanName="2D 렌더러 블렌드 스타일 조회", Category="2D 조명") static void GetRendererBlendStyle(Actor* target,int index,std::string& mode,std::string& mask);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetShadows", KoreanName="2D 광원 그림자 설정", Category="2D 조명") static void SetShadows(Actor* target,bool enabled,float strength=1.f,float softness=0.f,int resolution=128);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetShadows", KoreanName="2D 광원 그림자 조회", Category="2D 조명") static void GetShadows(Actor* target,bool& enabled,float& strength,float& softness,int& resolution);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetShape", KoreanName="2D 광원 모양·감쇠 거리 지정", Category="2D 조명") static void SetShapePath(Actor* target,const std::vector<Vec2>& path,float falloffDistance=.5f);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetShape", KoreanName="2D 광원 모양 조회", Category="2D 조명") static std::vector<Vec2> GetShapePath(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetShapeFalloff", KoreanName="2D 광원 모양 감쇠 거리 조회", Category="2D 조명") static float GetShapeFalloff(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetEnabled", KoreanName="2D 광원 활성화", Category="2D 조명") static void SetEnabled(Actor* target,bool enabled);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetEnabled", KoreanName="2D 광원 활성 여부", Category="2D 조명") static bool IsEnabled(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetType", KoreanName="2D 광원 종류 지정", Category="2D 조명") static void SetType(Actor* target,const std::string& type);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetType", KoreanName="2D 광원 종류 조회", Category="2D 조명") static std::string GetType(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetColor", KoreanName="2D 광원 색상 지정", Category="2D 조명") static void SetColor(Actor* target,const Color& color);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetColor", KoreanName="2D 광원 색상 조회", Category="2D 조명") static Color GetColor(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetIntensity", KoreanName="2D 광원 밝기 지정", Category="2D 조명") static void SetIntensity(Actor* target,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetIntensity", KoreanName="2D 광원 밝기 조회", Category="2D 조명") static float GetIntensity(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetRange", KoreanName="2D 광원 반경·감쇠 지정", Category="2D 조명") static void SetRange(Actor* target,float innerRadius,float outerRadius,float falloff=1.f);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetRange", KoreanName="2D 광원 반경·감쇠 조회", Category="2D 조명") static void GetRange(Actor* target,float& innerRadius,float& outerRadius,float& falloff);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetAngles", KoreanName="2D 광원 안쪽·바깥 각도 지정", Category="2D 조명") static void SetAngles(Actor* target,float innerAngle,float outerAngle);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetAngles", KoreanName="2D 광원 안쪽·바깥 각도 조회", Category="2D 조명") static void GetAngles(Actor* target,float& innerAngle,float& outerAngle);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetNormal", KoreanName="2D 광원 노멀 품질·높이 지정", Category="2D 조명") static void SetNormal(Actor* target,const std::string& mode,float distance=1.f);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetNormal", KoreanName="2D 광원 노멀 품질·높이 조회", Category="2D 조명") static void GetNormal(Actor* target,std::string& mode,float& distance);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="light2dSetLayers", KoreanName="2D 광원 대상 레이어 지정", Category="2D 조명") static void SetTargetSortingLayers(Actor* target,const std::vector<std::string>& layers);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="light2dGetLayers", KoreanName="2D 광원 대상 레이어 조회", Category="2D 조명") static std::vector<std::string> GetTargetSortingLayers(Actor* target);
};
HB_CLASS()
class ShadowCaster2D : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetEnabled", KoreanName="2D 그림자 활성화", Category="2D 그림자") static void SetEnabled(Actor* target,bool enabled);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetEnabled", KoreanName="2D 그림자 활성 여부", Category="2D 그림자") static bool IsEnabled(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetSource", KoreanName="2D 그림자 모양 출처 지정", Category="2D 그림자") static void SetSource(Actor* target,const std::string& source);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetSource", KoreanName="2D 그림자 모양 출처 조회", Category="2D 그림자") static std::string GetSource(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetCasting", KoreanName="2D 그림자 생성 방식 지정", Category="2D 그림자") static void SetCasting(Actor* target,const std::string& mode);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetCasting", KoreanName="2D 그림자 생성 방식 조회", Category="2D 그림자") static std::string GetCasting(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetShape", KoreanName="2D 그림자 모양 지정", Category="2D 그림자") static void SetShapePath(Actor* target,const std::vector<Vec2>& path);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetShape", KoreanName="2D 그림자 모양 조회", Category="2D 그림자") static std::vector<Vec2> GetShapePath(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetLayers", KoreanName="2D 그림자 대상 레이어 지정", Category="2D 그림자") static void SetTargetSortingLayers(Actor* target,const std::vector<std::string>& layers,bool allLayers=true);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetLayers", KoreanName="2D 그림자 대상 레이어 조회", Category="2D 그림자") static std::vector<std::string> GetTargetSortingLayers(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetAllLayers", KoreanName="2D 그림자 모든 레이어 여부", Category="2D 그림자") static bool UsesAllSortingLayers(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="shadow2dSetImageShape", KoreanName="2D 그림자 알파·경계 수축 설정", Category="2D 그림자") static void SetImageShapeOptions(Actor* target,float alphaCutoff,float trimEdge);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="shadow2dGetImageShape", KoreanName="2D 그림자 알파·경계 수축 조회", Category="2D 그림자") static void GetImageShapeOptions(Actor* target,float& alphaCutoff,float& trimEdge);
};
HB_CLASS()
class Tilemaps : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tileGet", KoreanName="타일 가져오기", Category="2D 타일맵") static int GetTile(Actor* target,const std::string& layer,const Vec2& cell);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tileHas", KoreanName="타일 존재 여부", Category="2D 타일맵") static bool HasTile(Actor* target,const std::string& layer,const Vec2& cell);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileSet", KoreanName="타일 지정·삭제", Category="2D 타일맵") static void SetTile(Actor* target,const std::string& layer,const Vec2& cell,int index);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileSetMany", KoreanName="여러 타일 지정·삭제", Category="2D 타일맵") static void SetTiles(Actor* target,const std::string& layer,const std::vector<Vec2>& cells,const std::vector<int>& indices);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileBoxFill", KoreanName="타일 영역 채우기", Category="2D 타일맵") static void BoxFill(Actor* target,const std::string& layer,const Vec2& cell,const Vec2& end,int index);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileFloodFill", KoreanName="같은 타일 채우기", Category="2D 타일맵") static void FloodFill(Actor* target,const std::string& layer,const Vec2& cell,int index);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileClear", KoreanName="타일 레이어 비우기", Category="2D 타일맵") static void ClearTiles(Actor* target,const std::string& layer);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tileWorldToCell", KoreanName="월드 좌표를 타일 셀로", Category="2D 타일맵") static Vec2 WorldToCell(Actor* target,const Vec3& position);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tileCellToWorld", KoreanName="타일 중심 월드 좌표", Category="2D 타일맵") static Vec3 GetCellCenterWorld(Actor* target,const Vec2& cell);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileRefresh", KoreanName="타일 새로고침", Category="2D 타일맵") static void RefreshTile(Actor* target,const std::string& layer,const Vec2& cell);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileProcessChanges", KoreanName="타일 화면·충돌 즉시 갱신", Category="2D 타일맵") static void ProcessTilemapChanges(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tileHasChanges", KoreanName="타일 변경 대기 여부", Category="2D 타일맵") static bool HasTilemapChanges(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tileLayerVisible", KoreanName="타일 레이어 표시", Category="2D 타일맵") static void SetLayerVisible(Actor* target,const std::string& layer,bool visible);
};
HB_CLASS()
class Physics : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getVelocity", KoreanName="속도 가져오기", Category="물리") static Vec3 GetVelocity(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="setVelocity", KoreanName="속도 설정", Category="물리") static void SetVelocity(Actor* target,const Vec3& velocity);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="addForce", KoreanName="힘 더하기", Category="물리") static void AddForce(Actor* target,const Vec3& force);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="impulse", KoreanName="충격량 더하기", Category="물리") static void AddImpulse(Actor* target,const Vec3& impulse);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="collisionEnabled", KoreanName="충돌 활성화", Category="물리") static void SetCollisionEnabled(Actor* target,bool enabled);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getAngularVelocity", KoreanName="각속도 가져오기", Category="물리") static Vec3 GetAngularVelocity(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="setAngularVelocity", KoreanName="각속도 설정", Category="물리") static void SetAngularVelocity(Actor* target,const Vec3& velocity);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsMass", KoreanName="실제 질량 가져오기", Category="물리") static float GetMass(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsSleeping", KoreanName="수면 상태 가져오기", Category="물리") static bool IsSleeping(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="physicsSleep", KoreanName="강체 수면 설정", Category="물리") static void SetSleeping(Actor* target,bool sleeping);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="physicsForce", KoreanName="모드로 힘 적용", Category="물리") static void ApplyForce(Actor* target,const Vec3& force,const std::string& mode);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="physicsForceAt", KoreanName="위치에 힘 적용", Category="물리") static void ApplyForceAtPosition(Actor* target,const Vec3& force,const Vec3& position,const std::string& mode);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="physicsTorque", KoreanName="토크 적용", Category="물리") static void AddTorque(Actor* target,const Vec3& torque);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="physicsAngularImpulse", KoreanName="각 충격량 적용", Category="물리") static void AddAngularImpulse(Actor* target,const Vec3& impulse);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsRaycast", KoreanName="충돌체 레이캐스트", Category="물리 질의") static HitResult Raycast(const Vec3& start,const Vec3& end,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsRaycastAll", KoreanName="모든 충돌체 레이캐스트", Category="물리 질의") static std::vector<HitResult> RaycastAll(const Vec3& start,const Vec3& end,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsSphereCast", KoreanName="구체 이동 충돌 검사", Category="물리 질의") static HitResult SphereCast(const Vec3& start,const Vec3& end,float radius,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsBoxCast", KoreanName="상자 이동 충돌 검사", Category="물리 질의") static HitResult BoxCast(const Vec3& start,const Vec3& end,const Vec3& extent,const Vec3& rotation,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsOverlapSphere", KoreanName="구체 겹침 검사", Category="물리 질의") static std::vector<Actor*> OverlapSphere(const Vec3& center,float radius,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsOverlapBox", KoreanName="상자 겹침 검사", Category="물리 질의") static std::vector<Actor*> OverlapBox(const Vec3& center,const Vec3& extent,const Vec3& rotation,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="physicsClosestPoint", KoreanName="가장 가까운 충돌체 점", Category="물리 질의") static HitResult ClosestPoint(const Vec3& point,int dimension=3,int mask=-1,bool includeTriggers=false,Actor* ignore=nullptr);
};

HB_CLASS()
class AI : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="runBehaviorTree", KoreanName="행동트리 실행", Category="AI") static void RunBehaviorTree(Actor* target,const std::string& asset);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stopBehaviorTree", KoreanName="행동트리 정지", Category="AI") static void StopBehaviorTree(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="behaviorTaskHandle", KoreanName="실행 중 태스크 핸들", Category="AI") static std::string GetTaskHandle(Actor* target,const std::string& node);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="behaviorTaskFinish", KoreanName="태스크 완료", Category="AI") static void FinishTask(Actor* target,const std::string& task,bool success);
};
HB_CLASS()
class Blackboard : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetBool", KoreanName="블랙보드 불리언 지정", Category="AI") static void SetBool(Actor* target,const std::string& key,bool value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetBool", KoreanName="블랙보드 불리언 가져오기", Category="AI") static bool GetBool(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetFloat", KoreanName="블랙보드 실수 지정", Category="AI") static void SetFloat(Actor* target,const std::string& key,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetFloat", KoreanName="블랙보드 실수 가져오기", Category="AI") static float GetFloat(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetInt", KoreanName="블랙보드 정수 지정", Category="AI") static void SetInt(Actor* target,const std::string& key,int value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetInt", KoreanName="블랙보드 정수 가져오기", Category="AI") static int GetInt(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetString", KoreanName="블랙보드 문자열 지정", Category="AI") static void SetString(Actor* target,const std::string& key,const std::string& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetString", KoreanName="블랙보드 문자열 가져오기", Category="AI") static std::string GetString(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetVector", KoreanName="블랙보드 벡터 지정", Category="AI") static void SetVector(Actor* target,const std::string& key,const Vec3& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetVector", KoreanName="블랙보드 벡터 가져오기", Category="AI") static Vec3 GetVector(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardSetObject", KoreanName="블랙보드 오브젝트 지정", Category="AI") static void SetObject(Actor* target,const std::string& key,Actor* value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="blackboardGetObject", KoreanName="블랙보드 오브젝트 가져오기", Category="AI") static Actor* GetObject(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="blackboardClear", KoreanName="블랙보드 키 비우기", Category="AI") static void Clear(Actor* target,const std::string& key);
};
HB_CLASS()
class States : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="startStateMachine", KoreanName="상태 머신 실행", Category="상태 머신") static void Start(Actor* target,const std::string& asset);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="stateGet", KoreanName="현재 상태 가져오기", Category="상태 머신") static std::string GetState(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateEvent", KoreanName="상태 이벤트 보내기", Category="상태 머신") static void SendEvent(Actor* target,const std::string& event);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateJump", KoreanName="상태 변경", Category="상태 머신") static void Jump(Actor* target,const std::string& state);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateStop", KoreanName="상태 머신 정지", Category="상태 머신") static void Stop(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateSetFloat", KoreanName="상태 파라미터 실수 지정", Category="상태 머신") static void SetFloat(Actor* target,const std::string& key,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="stateIsActive", KoreanName="계층 상태 활성 확인", Category="상태 머신") static bool IsInState(Actor* target,const std::string& state);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="stateGetPath", KoreanName="활성 상태 경로", Category="상태 머신") static std::vector<std::string> GetPath(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="stateElapsed", KoreanName="상태 경과 시간", Category="상태 머신") static float GetElapsed(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateSetBool", KoreanName="상태 파라미터 불리언 지정", Category="상태 머신") static void SetBool(Actor* target,const std::string& key,bool value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="stateSetString", KoreanName="상태 파라미터 문자열 지정", Category="상태 머신") static void SetString(Actor* target,const std::string& key,const std::string& value);
};
HB_CLASS()
class AnimationGraph : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphRetargetSource", KoreanName="리타게팅 원본 골격 지정", Category="애니메이션 그래프") static void SetRetargetSource(Actor* target,const std::string& node,Actor* source);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphRetargetSetProfile", KoreanName="리타게팅 프로필 지정", Category="애니메이션 그래프") static void SetRetargetProfile(Actor* target,const std::string& node,const std::string& value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphRetargetWeight", KoreanName="리타게팅 가중치 지정", Category="애니메이션 그래프") static void SetRetargetWeight(Actor* target,const std::string& node,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphRetargetScale", KoreanName="리타게팅 실제 배율", Category="애니메이션 그래프") static float GetRetargetScale(Actor* target,const std::string& node);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphRetargetProfile", KoreanName="리타게팅 활성 프로필", Category="애니메이션 그래프") static std::string GetRetargetProfile(Actor* target,const std::string& node);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKRotationLimit", KoreanName="CCD 관절 회전 제한", Category="애니메이션 그래프") static void SetIKRotationLimit(Actor* target,const std::string& node,const std::string& bone,float value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKTarget", KoreanName="IK 목표 위치 지정", Category="애니메이션 그래프") static void SetIKTarget(Actor* target,const std::string& node,const Vec3& value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKHint", KoreanName="IK 관절 힌트 지정", Category="애니메이션 그래프") static void SetIKHint(Actor* target,const std::string& node,const Vec3& value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKRotation", KoreanName="IK 목표 회전 지정", Category="애니메이션 그래프") static void SetIKRotation(Actor* target,const std::string& node,const Vec3& value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKWeight", KoreanName="IK 가중치 지정", Category="애니메이션 그래프") static void SetIKWeight(Actor* target,const std::string& node,float value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKTargetActor", KoreanName="IK 목표 오브젝트 지정", Category="애니메이션 그래프") static void SetIKTargetActor(Actor* target,const std::string& node,Actor* effector);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphIKHintActor", KoreanName="IK 힌트 오브젝트 지정", Category="애니메이션 그래프") static void SetIKHintActor(Actor* target,const std::string& node,Actor* effector);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphIKTip", KoreanName="IK 끝 뼈 위치", Category="애니메이션 그래프") static Vec3 GetIKTipPosition(Actor* target,const std::string& node);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphIKError", KoreanName="IK 목표 거리", Category="애니메이션 그래프") static float GetIKError(Actor* target,const std::string& node);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphRootMode", KoreanName="루트 모션 모드 지정", Category="애니메이션 그래프") static void SetRootMotionMode(Actor* target,const std::string& mode);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphRootPosition", KoreanName="루트 모션 이동량", Category="애니메이션 그래프") static Vec3 GetRootMotionPosition(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphRootRotation", KoreanName="루트 모션 회전량", Category="애니메이션 그래프") static Vec3 GetRootMotionRotation(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphPlay", KoreanName="애니메이션 그래프 재생", Category="애니메이션 그래프") static void Play(Actor* target,const std::string& asset);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphStop", KoreanName="애니메이션 그래프 정지", Category="애니메이션 그래프") static void Stop(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphPause", KoreanName="애니메이션 그래프 일시 정지", Category="애니메이션 그래프") static void Pause(Actor* target,bool paused);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphSetFloat", KoreanName="애니메이션 실수 파라미터 지정", Category="애니메이션 그래프") static void SetFloat(Actor* target,const std::string& key,float value);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphSetBool", KoreanName="애니메이션 불리언 파라미터 지정", Category="애니메이션 그래프") static void SetBool(Actor* target,const std::string& key,bool value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphGetFloat", KoreanName="애니메이션 실수 파라미터 조회", Category="애니메이션 그래프") static float GetFloat(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphGetBool", KoreanName="애니메이션 불리언 파라미터 조회", Category="애니메이션 그래프") static bool GetBool(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphSetInt", KoreanName="애니메이션 정수 파라미터 지정", Category="애니메이션 그래프") static void SetInteger(Actor* target,const std::string& key,int value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphGetInt", KoreanName="애니메이션 정수 파라미터 조회", Category="애니메이션 그래프") static int GetInteger(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphSetEnum", KoreanName="애니메이션 열거형 파라미터 지정", Category="애니메이션 그래프") static void SetEnum(Actor* target,const std::string& key,int value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphGetEnum", KoreanName="애니메이션 열거형 파라미터 조회", Category="애니메이션 그래프") static int GetEnum(Actor* target,const std::string& key);
    template<class E> static void SetEnum(Actor* target,const std::string& key,E value){
        static_assert(std::is_enum_v<E>,"Use an enum or integer value");const auto raw=static_cast<std::underlying_type_t<E>>(value);
        if constexpr(std::is_signed_v<decltype(raw)>){if(raw < -100000 || raw > 100000)throw std::out_of_range("animation enum value");}else if(raw > 100000)throw std::out_of_range("animation enum value");
        SetEnum(target,key,static_cast<int>(raw));
    }
    template<class E> static E GetEnumValue(Actor* target,const std::string& key){static_assert(std::is_enum_v<E>);using U=std::underlying_type_t<E>;const auto value=GetEnum(target,key);if(value < static_cast<long double>(std::numeric_limits<U>::lowest()) || value > static_cast<long double>(std::numeric_limits<U>::max()))throw std::out_of_range("animation enum type range");return static_cast<E>(value);}
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphSetTrigger", KoreanName="애니메이션 트리거 지정", Category="애니메이션 그래프") static void SetTrigger(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphResetTrigger", KoreanName="애니메이션 트리거 해제", Category="애니메이션 그래프") static void ResetTrigger(Actor* target,const std::string& key);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="animGraphCrossFade", KoreanName="포즈 상태 전환", Category="애니메이션 상태") static void CrossFade(Actor* target,const std::string& machine,const std::string& state,float duration,float offset);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphState", KoreanName="현재 포즈 상태", Category="애니메이션 상태") static std::string GetState(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphNextState", KoreanName="다음 포즈 상태", Category="애니메이션 상태") static std::string GetNextState(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphStateTime", KoreanName="포즈 상태 경과 시간", Category="애니메이션 상태") static float GetStateTime(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphNormalizedTime", KoreanName="포즈 상태 정규화 시간", Category="애니메이션 상태") static float GetNormalizedTime(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphStateWeight", KoreanName="포즈 상태 혼합 가중치", Category="애니메이션 상태") static float GetStateWeight(Actor* target,const std::string& machine,const std::string& state);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphTransitioning", KoreanName="포즈 전환 중인지", Category="애니메이션 상태") static bool IsTransitioning(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphTransitionProgress", KoreanName="포즈 전환 진행률", Category="애니메이션 상태") static float GetTransitionProgress(Actor* target,const std::string& machine);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphSyncLeader", KoreanName="동기화 리더 클립", Category="애니메이션 동기화") static std::string GetSyncLeader(Actor* target,const std::string& group);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphSyncPhase", KoreanName="동기화 재생 비율", Category="애니메이션 동기화") static float GetSyncPhase(Actor* target,const std::string& group);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="animGraphSyncMode", KoreanName="동기화 길이·마커 방식", Category="애니메이션 동기화") static std::string GetSyncMode(Actor* target,const std::string& group);
};
HB_CLASS()
class SpriteSkin : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="skinSetPosition", KoreanName="2D 뼈 위치 지정", Category="2D 뼈 변형") static void SetBonePosition(Actor* target,const std::string& bone,const Vec2& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="skinGetPosition", KoreanName="2D 뼈 위치 조회", Category="2D 뼈 변형") static Vec2 GetBonePosition(Actor* target,const std::string& bone);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="skinSetRotation", KoreanName="2D 뼈 회전 지정", Category="2D 뼈 변형") static void SetBoneRotation(Actor* target,const std::string& bone,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="skinGetRotation", KoreanName="2D 뼈 회전 조회", Category="2D 뼈 변형") static float GetBoneRotation(Actor* target,const std::string& bone);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="skinSetScale", KoreanName="2D 뼈 크기 지정", Category="2D 뼈 변형") static void SetBoneScale(Actor* target,const std::string& bone,const Vec2& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="skinGetScale", KoreanName="2D 뼈 크기 조회", Category="2D 뼈 변형") static Vec2 GetBoneScale(Actor* target,const std::string& bone);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="skinReset", KoreanName="2D 바인드 포즈 복원", Category="2D 뼈 변형") static void ResetBindPose(Actor* target);
};
HB_CLASS()
class IK2D : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dSetTarget", KoreanName="2D IK 목표 위치 지정", Category="2D IK") static void SetTarget(Actor* target,const std::string& solver,const Vec2& value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="ik2dGetTarget", KoreanName="2D IK 목표 위치 조회", Category="2D IK") static Vec2 GetTarget(Actor* target,const std::string& solver);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dSetRotation", KoreanName="2D IK 목표 회전 지정", Category="2D IK") static void SetTargetRotation(Actor* target,const std::string& solver,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="ik2dGetRotation", KoreanName="2D IK 목표 회전 조회", Category="2D IK") static float GetTargetRotation(Actor* target,const std::string& solver);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dBindTarget", KoreanName="2D IK 목표 오브젝트 지정", Category="2D IK") static void SetTargetActor(Actor* target,const std::string& solver,Actor* actor,const Vec2& offset);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dClearTarget", KoreanName="2D IK 목표 오브젝트 해제", Category="2D IK") static void ClearTargetActor(Actor* target,const std::string& solver);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dSetWeight", KoreanName="2D IK 솔버 가중치 지정", Category="2D IK") static void SetWeight(Actor* target,const std::string& solver,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="ik2dGetWeight", KoreanName="2D IK 솔버 가중치 조회", Category="2D IK") static float GetWeight(Actor* target,const std::string& solver);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dSetEnabled", KoreanName="2D IK 솔버 활성화", Category="2D IK") static void SetEnabled(Actor* target,const std::string& solver,bool value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="ik2dIsEnabled", KoreanName="2D IK 솔버 활성화 조회", Category="2D IK") static bool IsEnabled(Actor* target,const std::string& solver);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="ik2dSetMasterWeight", KoreanName="2D IK 전체 가중치 지정", Category="2D IK") static void SetMasterWeight(Actor* target,float value);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="ik2dGetMasterWeight", KoreanName="2D IK 전체 가중치 조회", Category="2D IK") static float GetMasterWeight(Actor* target);
};
HB_CLASS()
class Montage : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="playMontage", KoreanName="몽타주 재생", Category="몽타주") static void Play(Actor* target,const std::string& asset,const std::string& section);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageStop", KoreanName="몽타주 정지", Category="몽타주") static void Stop(Actor* target,float blendTime=0.0f);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montagePause", KoreanName="몽타주 일시 정지", Category="몽타주") static void Pause(Actor* target,bool paused);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageJump", KoreanName="몽타주 섹션 이동", Category="몽타주") static void JumpToSection(Actor* target,const std::string& section);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageNext", KoreanName="다음 몽타주 섹션 지정", Category="몽타주") static void SetNextSection(Actor* target,const std::string& section,const std::string& next);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="montagePosition", KoreanName="몽타주 재생 위치", Category="몽타주") static float GetPosition(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageSeek", KoreanName="몽타주 재생 위치 지정", Category="몽타주") static void Seek(Actor* target,float time);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageStopGroup", KoreanName="몽타주 그룹 정지", Category="몽타주") static void StopGroup(Actor* target,const std::string& group,float blendTime=0.0f);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montagePauseGroup", KoreanName="몽타주 그룹 일시 정지", Category="몽타주") static void PauseGroup(Actor* target,const std::string& group,bool paused);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="montageSeekGroup", KoreanName="몽타주 그룹 위치 지정", Category="몽타주") static void SeekGroup(Actor* target,const std::string& group,float time);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="montagePositionGroup", KoreanName="몽타주 그룹 재생 위치", Category="몽타주") static float GetGroupPosition(Actor* target,const std::string& group);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="montageWeightGroup", KoreanName="몽타주 그룹 가중치", Category="몽타주") static float GetGroupWeight(Actor* target,const std::string& group);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="montagePlayingGroup", KoreanName="몽타주 그룹 재생 중", Category="몽타주") static bool IsGroupPlaying(Actor* target,const std::string& group);
};
HB_CLASS()
class LevelSequence : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="playSequence", KoreanName="레벨 시퀀스 재생", Category="시퀀스") static void Play(Actor* target,const std::string& asset);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="sequenceStop", KoreanName="레벨 시퀀스 정지", Category="시퀀스") static void Stop(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="sequencePause", KoreanName="레벨 시퀀스 일시 정지", Category="시퀀스") static void Pause(Actor* target,bool paused);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="sequenceSeek", KoreanName="레벨 시퀀스 시간 이동", Category="시퀀스") static void Seek(Actor* target,float time);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="sequencePosition", KoreanName="레벨 시퀀스 재생 위치", Category="시퀀스") static float GetPosition(Actor* target);
};
HB_CLASS()
class Navigation : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="navigationMove", KoreanName="경로를 따라 이동", Category="AI 내비게이션") static void MoveTo(Actor* target,const Vec3& destination);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="navigationStop", KoreanName="경로 이동 정지", Category="AI 내비게이션") static void Stop(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="navigationStatus", KoreanName="경로 이동 상태", Category="AI 내비게이션") static std::string GetStatus(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="navigationPath", KoreanName="이동 경로 가져오기", Category="AI 내비게이션") static std::vector<Vec3> GetPath(Actor* target);
};
HB_CLASS()
class Perception : public Library {
public:
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="perceptionTargets", KoreanName="감지한 오브젝트", Category="AI 감지") static std::vector<Actor*> GetTargets(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="perceptionForget", KoreanName="감지 기억 비우기", Category="AI 감지") static void Forget(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="reportNoise", KoreanName="소리 자극 알림", Category="AI 감지") static void ReportNoise(Actor* target,const Vec3& position,float loudness,float radius,const std::string& tag);
};
HB_CLASS()
class Materials : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="setMaterial", KoreanName="머테리얼 지정", Category="머테리얼") static void Set(Actor* target,const std::string& material,int slot=0);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="materialFloat", KoreanName="머테리얼 실수 설정", Category="머테리얼") static void SetFloat(Actor* target,const std::string& parameter,float value);
};
HB_CLASS()
class Particles : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="particlePlay", KoreanName="파티클 재생", Category="파티클") static void Play(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="particleStop", KoreanName="파티클 정지", Category="파티클") static void Stop(Actor* target,bool clear);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="particlePause", KoreanName="파티클 일시정지", Category="파티클") static void Pause(Actor* target,bool paused);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="particleEmit", KoreanName="파티클 방출", Category="파티클") static void Emit(Actor* target,int count);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="particleCount", KoreanName="파티클 개수", Category="파티클") static int GetCount(Actor* target);
};
HB_CLASS()
class Tags : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tagAdd", KoreanName="게임플레이 태그 추가", Category="게임플레이 태그") static void Add(Actor* target,const std::string& tag);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="tagRemove", KoreanName="게임플레이 태그 제거", Category="게임플레이 태그") static void Remove(Actor* target,const std::string& tag);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tagGet", KoreanName="게임플레이 태그 목록", Category="게임플레이 태그") static std::vector<std::string> Get(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tagHas", KoreanName="게임플레이 태그 확인", Category="게임플레이 태그") static bool Has(Actor* target,const std::string& tag,bool exact);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tagAny", KoreanName="하나 이상의 태그 확인", Category="게임플레이 태그") static bool HasAny(Actor* target,const std::vector<std::string>& tags,bool exact);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tagAll", KoreanName="모든 태그 확인", Category="게임플레이 태그") static bool HasAll(Actor* target,const std::vector<std::string>& tags,bool exact);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="tagQuery", KoreanName="태그 조건 쿼리", Category="게임플레이 태그") static bool MatchesQuery(Actor* target,const std::string& query);
};
inline Vec3 operator+(Vec3 a,Vec3 b){return {a.x+b.x,a.y+b.y,a.z+b.z};}
inline Vec3 operator-(Vec3 a,Vec3 b){return {a.x-b.x,a.y-b.y,a.z-b.z};}
inline Vec3 operator*(Vec3 a,float s){return {a.x*s,a.y*s,a.z*s};}

HB_CLASS()
class Math : public Library {
public:
    HB_FUNCTION(BlueprintPure, NodeKey="add", KoreanName="실수 더하기") static float AddFloat(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="subtract", KoreanName="빼기") static float Subtract(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="multiply", KoreanName="곱하기") static float Multiply(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="divide", KoreanName="나누기") static float Divide(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="min", KoreanName="최솟값") static float Min(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="max", KoreanName="최댓값") static float Max(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="power", KoreanName="거듭제곱") static float Power(float a,float b);
    HB_FUNCTION(BlueprintPure, NodeKey="abs", KoreanName="절댓값") static float Abs(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="sqrt", KoreanName="제곱근") static float Sqrt(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="sin", KoreanName="사인") static float Sin(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="cos", KoreanName="코사인") static float Cos(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="floor", KoreanName="내림") static float Floor(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="ceil", KoreanName="올림") static float Ceil(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="round", KoreanName="반올림") static float Round(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="clamp", KoreanName="범위 제한") static float Clamp(float value,float min,float max);
    HB_FUNCTION(BlueprintPure, NodeKey="lerp", KoreanName="선형 보간") static float Lerp(float a,float b,float alpha);
    HB_FUNCTION(BlueprintPure, NodeKey="nearlyEqual", KoreanName="거의 같은 실수") static bool NearlyEqual(float a,float b,float tolerance);
    HB_FUNCTION(BlueprintPure, NodeKey="mapRange", KoreanName="범위 변환") static float MapRange(float value,float inMin,float inMax,float outMin,float outMax);
    HB_FUNCTION(BlueprintPure, NodeKey="smoothStep", KoreanName="부드러운 보간") static float SmoothStep(float min,float max,float value);
    HB_FUNCTION(BlueprintPure, NodeKey="degreesToRadians", KoreanName="도를 라디안으로") static float DegreesToRadians(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="radiansToDegrees", KoreanName="라디안을 도로") static float RadiansToDegrees(float value);
    HB_FUNCTION(BlueprintPure, NodeKey="floatInterp", KoreanName="실수 따라가기 보간") static float FInterpTo(float current,float target,float delta,float speed);
};
HB_CLASS()
class VectorMath : public Library {
public:
    HB_FUNCTION(BlueprintPure, NodeKey="vec3", KoreanName="벡터3 만들기") static Vec3 MakeVector3(float x,float y,float z);
    HB_FUNCTION(BlueprintPure, NodeKey="vec2", KoreanName="벡터2 만들기") static Vec2 MakeVector2(float x,float y);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorAdd", KoreanName="벡터 더하기") static Vec3 AddVector(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorSubtract", KoreanName="벡터 빼기") static Vec3 SubtractVector(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorScale", KoreanName="벡터 배율") static Vec3 ScaleVector(const Vec3& value,float scale);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorLength", KoreanName="벡터 길이") static float VectorLength(const Vec3& value);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorLengthSquared", KoreanName="벡터 길이 제곱") static float VectorLengthSquared(const Vec3& value);
    HB_FUNCTION(BlueprintPure, NodeKey="normalize", KoreanName="벡터 정규화 노멀벡터 단위벡터") static Vec3 NormalizeVector(const Vec3& value);
    HB_FUNCTION(BlueprintPure, NodeKey="distance", KoreanName="벡터 거리") static float Distance(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="distanceSquared", KoreanName="벡터 거리 제곱") static float DistanceSquared(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="dot", KoreanName="벡터 내적") static float DotProduct(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="cross", KoreanName="벡터 외적") static Vec3 CrossProduct(const Vec3& a,const Vec3& b);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorLerp", KoreanName="벡터 보간") static Vec3 LerpVector(const Vec3& a,const Vec3& b,float alpha);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorInterp", KoreanName="벡터 따라가기 보간 이동") static Vec3 VInterpTo(const Vec3& current,const Vec3& target,float delta,float speed);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorMoveTowards", KoreanName="목표로 벡터 이동 일정속도") static Vec3 MoveTowards(const Vec3& current,const Vec3& target,float distance);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorReflect", KoreanName="노멀벡터 반사") static Vec3 ReflectVector(const Vec3& value,const Vec3& normal);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorProject", KoreanName="벡터 투영") static Vec3 ProjectVector(const Vec3& value,const Vec3& onto);
    HB_FUNCTION(BlueprintPure, NodeKey="vectorClampLength", KoreanName="벡터 길이 제한") static Vec3 ClampVectorLength(const Vec3& value,float maxLength);
    HB_FUNCTION(BlueprintPure, NodeKey="vector2Length", KoreanName="벡터2 길이") static float Vector2Length(const Vec2& value);
    HB_FUNCTION(BlueprintPure, NodeKey="vector2Normalize", KoreanName="벡터2 정규화") static Vec2 NormalizeVector2(const Vec2& value);
};
HB_CLASS()
class Clock : public Library {
public:
    HB_FUNCTION(BlueprintPure, NodeKey="time", KoreanName="게임 시간 초 시간측정") static float GetGameTime();
    HB_FUNCTION(BlueprintPure, NodeKey="deltaSeconds", KoreanName="프레임 델타 시간") static float GetWorldDeltaSeconds();
    HB_FUNCTION(BlueprintPure, NodeKey="realTime", KoreanName="실제 경과 시간 초") static float GetRealTime();
    HB_FUNCTION(BlueprintCallable, NodeKey="timeScale", KoreanName="게임 시간 배율") static void SetTimeScale(float scale);
    HB_FUNCTION(BlueprintCallable, NodeKey="gamePaused", KoreanName="게임 시간 일시정지") static void SetPaused(bool paused);
    static void Tick(float delta);
    static void Reset();
    static float TimeScale(){return scale_;}
    static bool IsPaused(){return paused_;}
private:
    inline static float seconds_=0,delta_=0,scale_=1;
    inline static bool paused_=false;
    inline static const auto epoch_=std::chrono::steady_clock::now();
};
HB_CLASS()
class Timers : public Library {
public:
    HB_FUNCTION(BlueprintCallable, NodeKey="timer", ReturnPin="handle", KoreanName="타이머 설정") static std::string SetTimer(float duration,bool loop,const std::string& event);
    HB_FUNCTION(BlueprintCallable, NodeKey="clearTimer", KoreanName="타이머 해제") static void ClearTimer(const std::string& handle);
    HB_FUNCTION(BlueprintCallable, NodeKey="pauseTimer", KoreanName="타이머 일시정지") static void PauseTimer(const std::string& handle);
    HB_FUNCTION(BlueprintCallable, NodeKey="resumeTimer", KoreanName="타이머 재개") static void ResumeTimer(const std::string& handle);
    HB_FUNCTION(BlueprintPure, NodeKey="timerElapsed", KoreanName="타이머 경과 시간") static float GetTimerElapsed(const std::string& handle);
    HB_FUNCTION(BlueprintPure, NodeKey="timerRemaining", KoreanName="타이머 남은 시간") static float GetTimerRemaining(const std::string& handle);
    HB_FUNCTION(BlueprintPure, NodeKey="timerActive", KoreanName="타이머 활성 여부") static bool IsTimerActive(const std::string& handle);
    HB_FUNCTION(BlueprintCallable, NodeKey="startStopwatch", ReturnPin="handle", KoreanName="시간측정 시작 스톱워치") static std::string StartStopwatch(const std::string& name);
    HB_FUNCTION(BlueprintPure, NodeKey="stopwatchElapsed", KoreanName="시간측정 경과 스톱워치") static float GetStopwatchElapsed(const std::string& handle);
    HB_FUNCTION(BlueprintCallable, NodeKey="stopStopwatch", KoreanName="시간측정 종료 스톱워치") static float StopStopwatch(const std::string& handle);
    static void Tick(float delta);
    static std::vector<std::string> TakeEvents();
    struct Callback {std::string event,owner,scope,handle;};
    static std::vector<Callback> TakeCallbacks();
    static bool CanBatchFrame(){return std::none_of(timers_.begin(),timers_.end(),[](const auto& item){return item.second.active&&!item.second.paused;});}
    static void SetContext(const std::string& owner,const std::string& scope){owner_=owner;scope_=scope;}
    static std::pair<std::string,std::string> GetContext(){return {owner_,scope_};}
    static void ClearOwner(const std::string& owner){for(auto it=timers_.begin();it!=timers_.end();)if(it->second.owner==owner)it=timers_.erase(it);else ++it;for(auto it=watches_.begin();it!=watches_.end();)if(it->second.owner==owner)it=watches_.erase(it);else ++it;events_.erase(std::remove_if(events_.begin(),events_.end(),[&](const Callback& c){return c.owner==owner;}),events_.end());}
    static void PruneOwners(const std::vector<std::string>& owners){const std::unordered_set<std::string> live(owners.begin(),owners.end());std::unordered_set<std::string> expired;for(const auto& t:timers_)if(!t.second.owner.empty()&&!live.count(t.second.owner))expired.insert(t.second.owner);for(const auto& w:watches_)if(!w.second.owner.empty()&&!live.count(w.second.owner))expired.insert(w.second.owner);for(const auto& e:events_)if(!e.owner.empty()&&!live.count(e.owner))expired.insert(e.owner);for(const auto& id:expired)ClearOwner(id);}
    static void PruneScopes(const std::vector<std::string>& active);
    static void Reset(){timers_.clear();watches_.clear();events_.clear();owner_.clear();scope_.clear();next_=0;}
private:
    struct Timer {float duration,elapsed=0;bool loop,paused=false,active=true;std::string event,owner,scope;};
    struct Stopwatch {std::chrono::steady_clock::time_point start;float elapsed=0;bool running=true;std::string owner;};
    inline static std::uint64_t next_=0;
    // Completed unscoped handles remain queryable until ClearTimer or world reset.
    inline static std::unordered_map<std::string,Timer> timers_;
    inline static std::unordered_map<std::string,Stopwatch> watches_;
    inline static std::vector<Callback> events_;
    inline static std::string owner_,scope_;
};
HB_CLASS()
class Scene : public Library {
public:
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="sceneSpawn", KoreanName="에셋/클래스 생성", Category="오브젝트") static Actor* Spawn(const std::string& blueprintOrPrefab,const Transform& transform,const std::string& actorId="");
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="sceneDestroy", KoreanName="생성 액터 제거/풀 반환", Category="오브젝트") static void Destroy(Actor* target);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="sceneFindClass", KoreanName="클래스로 액터 찾기", Category="오브젝트") static std::vector<Actor*> GetAllActorsOfClass(const std::string& className,bool includeInactive=false);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="sceneFindTag", KoreanName="태그로 액터 찾기", Category="오브젝트") static std::vector<Actor*> GetActorsWithTag(const std::string& tag,bool includeInactive=false);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="sceneFindId", KoreanName="ID로 액터 찾기", Category="오브젝트") static Actor* FindActorById(const std::string& id,bool includeInactive=false);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="openScene", KoreanName="장면 열기", Category="장면") static void Open(const std::string& scene);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="openSceneArgs", KoreanName="장면 열기와 인자", Category="장면") static void OpenWithArguments(const std::string& scene,const std::string& json);
    static void Open(const std::string& scene,const Json& arguments){OpenWithArguments(scene,arguments.dump());}
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getWorldPosition", KoreanName="월드 위치 가져오기", Category="변환") static Vec3 GetWorldPosition(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="setWorldPosition", KoreanName="월드 위치 설정", Category="변환") static void SetWorldPosition(Actor* target,const Vec3& position);
    HB_FUNCTION(BlueprintPure, EngineService, NodeKey="getLocalPosition", KoreanName="로컬 위치 가져오기", Category="변환") static Vec3 GetLocalPosition(Actor* target);
    HB_FUNCTION(BlueprintCallable, EngineService, NodeKey="setLocalPosition", KoreanName="로컬 위치 설정", Category="변환") static void SetLocalPosition(Actor* target,const Vec3& position);
    HB_FUNCTION(BlueprintPure, NodeKey="location", KoreanName="위치 가져오기") static Vec3 GetPosition(Actor* target);
    HB_FUNCTION(BlueprintCallable, NodeKey="setPosition", KoreanName="위치 설정") static void SetPosition(Actor* target,const Vec3& position);
    HB_FUNCTION(BlueprintPure, NodeKey="getRotation", KoreanName="회전 가져오기") static Vec3 GetRotation(Actor* target);
    HB_FUNCTION(BlueprintCallable, NodeKey="setRotation", KoreanName="회전 설정") static void SetRotation(Actor* target,const Vec3& value);
    HB_FUNCTION(BlueprintPure, NodeKey="getScale", KoreanName="크기 가져오기") static Vec3 GetScale(Actor* target);
    HB_FUNCTION(BlueprintCallable, NodeKey="setScale", KoreanName="크기 설정") static void SetScale(Actor* target,const Vec3& value);
    HB_FUNCTION(BlueprintPure, NodeKey="getTransform", KoreanName="트랜스폼 가져오기") static Transform GetTransform(Actor* target);
    HB_FUNCTION(BlueprintCallable, NodeKey="setTransform", KoreanName="트랜스폼 설정") static void SetTransform(Actor* target,const Transform& value);
    HB_FUNCTION(BlueprintCallable, NodeKey="translate", KoreanName="벡터로 위치 이동 오프셋") static void AddOffset(Actor* target,const Vec3& value);
    HB_FUNCTION(BlueprintCallable, NodeKey="rotate", KoreanName="회전 더하기") static void AddRotation(Actor* target,const Vec3& value);
    HB_FUNCTION(BlueprintCallable, NodeKey="moveActorTowards", KoreanName="오브젝트 목표로 이동") static bool MoveActorTowards(Actor* target,const Vec3& destination,float speed,float delta);
};

inline float Math::AddFloat(float a,float b){return a+b;}
inline float Math::Subtract(float a,float b){return a-b;}
inline float Math::Multiply(float a,float b){return a*b;}
inline float Math::Divide(float a,float b){if(b==0)throw std::invalid_argument("division by zero");return a/b;}
inline float Math::Min(float a,float b){return std::min(a,b);}
inline float Math::Max(float a,float b){return std::max(a,b);}
inline float Math::Power(float a,float b){return std::pow(a,b);}
inline float Math::Abs(float value){return std::abs(value);}
inline float Math::Sqrt(float value){if(value<0)throw std::invalid_argument("negative square root");return std::sqrt(value);}
inline float Math::Sin(float value){return std::sin(value);}
inline float Math::Cos(float value){return std::cos(value);}
inline float Math::Floor(float value){return std::floor(value);}
inline float Math::Ceil(float value){return std::ceil(value);}
inline float Math::Round(float value){return std::round(value);}
inline float Math::Clamp(float value,float min,float max){if(min>max)throw std::invalid_argument("invalid range");return std::clamp(value,min,max);}
inline float Math::Lerp(float a,float b,float alpha){return a+(b-a)*alpha;}
inline bool Math::NearlyEqual(float a,float b,float tolerance){return std::abs(a-b)<=std::max(0.f,tolerance);}
inline float Math::MapRange(float value,float inMin,float inMax,float outMin,float outMax){return Lerp(outMin,outMax,Divide(value-inMin,inMax-inMin));}
inline float Math::SmoothStep(float min,float max,float value){const float t=Clamp(Divide(value-min,max-min),0,1);return t*t*(3-2*t);}
inline float Math::DegreesToRadians(float value){return value*0.017453292519943295f;}
inline float Math::RadiansToDegrees(float value){return value*57.29577951308232f;}
inline float Math::FInterpTo(float current,float target,float delta,float speed){return speed<=0?target:Lerp(current,target,Clamp(std::max(0.f,delta)*speed,0,1));}
inline Vec3 VectorMath::MakeVector3(float x,float y,float z){return {x,y,z};}
inline Vec2 VectorMath::MakeVector2(float x,float y){return {x,y};}
inline Vec3 VectorMath::AddVector(const Vec3& a,const Vec3& b){return a+b;}
inline Vec3 VectorMath::SubtractVector(const Vec3& a,const Vec3& b){return a-b;}
inline Vec3 VectorMath::ScaleVector(const Vec3& value,float scale){return value*scale;}
inline float VectorMath::VectorLengthSquared(const Vec3& value){return DotProduct(value,value);}
inline float VectorMath::VectorLength(const Vec3& value){return std::sqrt(VectorLengthSquared(value));}
inline Vec3 VectorMath::NormalizeVector(const Vec3& value){const float size=VectorLength(value);return size>1e-8f?value*(1/size):Vec3{};}
inline float VectorMath::Distance(const Vec3& a,const Vec3& b){return VectorLength(a-b);}
inline float VectorMath::DistanceSquared(const Vec3& a,const Vec3& b){return VectorLengthSquared(a-b);}
inline float VectorMath::DotProduct(const Vec3& a,const Vec3& b){return a.x*b.x+a.y*b.y+a.z*b.z;}
inline Vec3 VectorMath::CrossProduct(const Vec3& a,const Vec3& b){return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};}
inline Vec3 VectorMath::LerpVector(const Vec3& a,const Vec3& b,float alpha){return a+(b-a)*alpha;}
inline Vec3 VectorMath::VInterpTo(const Vec3& current,const Vec3& target,float delta,float speed){return speed<=0?target:LerpVector(current,target,Math::Clamp(std::max(0.f,delta)*speed,0,1));}
inline Vec3 VectorMath::MoveTowards(const Vec3& current,const Vec3& target,float distance){const Vec3 d=target-current;const float size=VectorLength(d);return size<=std::max(0.f,distance)||size<1e-8f?target:current+d*(std::max(0.f,distance)/size);}
inline Vec3 VectorMath::ReflectVector(const Vec3& value,const Vec3& normal){const Vec3 n=NormalizeVector(normal);return value-n*(2*DotProduct(value,n));}
inline Vec3 VectorMath::ProjectVector(const Vec3& value,const Vec3& onto){const float size=VectorLengthSquared(onto);return size>1e-16f?onto*(DotProduct(value,onto)/size):Vec3{};}
inline Vec3 VectorMath::ClampVectorLength(const Vec3& value,float maxLength){const float size=VectorLength(value);return size>std::max(0.f,maxLength)&&size>1e-8f?value*(std::max(0.f,maxLength)/size):value;}
inline float VectorMath::Vector2Length(const Vec2& value){return std::hypot(value.x,value.y);}
inline Vec2 VectorMath::NormalizeVector2(const Vec2& value){const float size=Vector2Length(value);return size>1e-8f?Vec2{value.x/size,value.y/size}:Vec2{};}
inline float Clock::GetGameTime(){return seconds_;}
inline float Clock::GetWorldDeltaSeconds(){return delta_;}
inline float Clock::GetRealTime(){return std::chrono::duration<float>(std::chrono::steady_clock::now()-epoch_).count();}
inline void Clock::SetTimeScale(float scale){if(!std::isfinite(scale)||scale<0)throw std::invalid_argument("invalid time scale");scale_=scale;}
inline void Clock::SetPaused(bool paused){paused_=paused;}
inline void Clock::Tick(float delta){if(!std::isfinite(delta)||delta<0)throw std::invalid_argument("invalid delta");delta_=paused_?0:delta*scale_;seconds_+=delta_;}
inline void Clock::Reset(){seconds_=delta_=0;scale_=1;paused_=false;}
inline std::string Timers::SetTimer(float duration,bool loop,const std::string& event){if(!std::isfinite(duration)||duration<=0)throw std::invalid_argument("invalid duration");const auto handle="timer_"+std::to_string(++next_);timers_.emplace(handle,Timer{duration,0,loop,false,true,event,owner_,scope_});return handle;}
inline void Timers::ClearTimer(const std::string& handle){timers_.erase(handle);}
inline void Timers::PauseTimer(const std::string& handle){const auto i=timers_.find(handle);if(i!=timers_.end())i->second.paused=true;}
inline void Timers::ResumeTimer(const std::string& handle){const auto i=timers_.find(handle);if(i!=timers_.end())i->second.paused=false;}
inline float Timers::GetTimerElapsed(const std::string& handle){const auto i=timers_.find(handle);return i==timers_.end()?0:i->second.elapsed;}
inline float Timers::GetTimerRemaining(const std::string& handle){const auto i=timers_.find(handle);return i==timers_.end()?0:std::max(0.f,i->second.duration-i->second.elapsed);}
inline bool Timers::IsTimerActive(const std::string& handle){const auto i=timers_.find(handle);return i!=timers_.end()&&i->second.active&&!i->second.paused;}
inline void Timers::Tick(float delta){if(!std::isfinite(delta)||delta<0)throw std::invalid_argument("invalid delta");for(auto& item:timers_){auto& t=item.second;if(!t.active||t.paused)continue;t.elapsed+=delta;if(t.elapsed>=t.duration){events_.push_back({t.event,t.owner,t.scope,item.first});if(t.loop)t.elapsed=std::fmod(t.elapsed,t.duration);else{t.elapsed=t.duration;t.active=false;}}}} // One notification per frame keeps catch-up bounded.
inline std::vector<Timers::Callback> Timers::TakeCallbacks(){auto result=std::move(events_);events_.clear();return result;}
inline std::vector<std::string> Timers::TakeEvents(){std::vector<std::string> result;for(const auto& event:TakeCallbacks())result.push_back(event.event);return result;}
inline void Timers::PruneScopes(const std::vector<std::string>& active){const std::unordered_set<std::string> scopes(active.begin(),active.end());const auto alive=[&](const std::string& scope){return scope.empty()||scopes.count(scope);};for(auto it=timers_.begin();it!=timers_.end();)if(!alive(it->second.scope))it=timers_.erase(it);else ++it;events_.erase(std::remove_if(events_.begin(),events_.end(),[&](const Callback& c){return !alive(c.scope);}),events_.end());}
inline std::string Timers::StartStopwatch(const std::string& name){const auto handle=name+"_"+std::to_string(++next_);watches_.emplace(handle,Stopwatch{std::chrono::steady_clock::now(),0,true,owner_});return handle;}
inline float Timers::GetStopwatchElapsed(const std::string& handle){const auto i=watches_.find(handle);return i==watches_.end()?0:i->second.running?std::chrono::duration<float>(std::chrono::steady_clock::now()-i->second.start).count():i->second.elapsed;}
inline float Timers::StopStopwatch(const std::string& handle){const auto i=watches_.find(handle);if(i==watches_.end())return 0;const float elapsed=GetStopwatchElapsed(handle);i->second.elapsed=elapsed;i->second.running=false;return elapsed;}
inline Actor& checked(Actor* target){if(!target)throw std::invalid_argument("null actor");return *target;}
inline Vec3 Scene::GetPosition(Actor* target){return checked(target).transform.position;}
inline void Scene::SetPosition(Actor* target,const Vec3& position){checked(target).transform.position=position;}
inline Vec3 Scene::GetRotation(Actor* target){return checked(target).transform.rotation;}
inline void Scene::SetRotation(Actor* target,const Vec3& value){checked(target).transform.rotation=value;}
inline Vec3 Scene::GetScale(Actor* target){return checked(target).transform.scale;}
inline void Scene::SetScale(Actor* target,const Vec3& value){checked(target).transform.scale=value;}
inline Transform Scene::GetTransform(Actor* target){return checked(target).transform;}
inline void Scene::SetTransform(Actor* target,const Transform& value){checked(target).transform=value;}
inline void Scene::AddOffset(Actor* target,const Vec3& value){SetPosition(target,GetPosition(target)+value);}
inline void Scene::AddRotation(Actor* target,const Vec3& value){SetRotation(target,GetRotation(target)+value);}
inline bool Scene::MoveActorTowards(Actor* target,const Vec3& destination,float speed,float delta){SetPosition(target,VectorMath::MoveTowards(GetPosition(target),destination,std::max(0.f,speed)*std::max(0.f,delta)));return VectorMath::DistanceSquared(GetPosition(target),destination)<1e-12f;}
inline void AdvanceFrame(float delta){Clock::Tick(delta);Timers::Tick(Clock::GetWorldDeltaSeconds());}
}

#include <HBEngine/Library.hpp>

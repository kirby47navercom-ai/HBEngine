#pragma once
#include "Game.hpp"

namespace hb {
// Bit positions follow the displayed member order. Unselected members stay intact.
struct Struct {
    static Vec2 Make(float x,float y){return {x,y};}
    static Vec3 Make(float x,float y,float z){return {x,y,z};}
    static Color Make(float r,float g,float b,float a){return {r,g,b,a};}
    static Transform Make(const Vec3& position,const Vec3& rotation,const Vec3& scale=Vec3{1,1,1}){return {position,rotation,scale};}
    static HitResult Make(bool hit,const Vec3& position,const Vec3& normal,Actor* actor=nullptr){return {hit,position,normal,actor};}
    static void Break(const Vec2& v,float& x,float& y){x=v.x;y=v.y;}
    static void Break(const Vec3& v,float& x,float& y,float& z){x=v.x;y=v.y;z=v.z;}
    static void Break(const Color& v,float& r,float& g,float& b,float& a){r=v.r;g=v.g;b=v.b;a=v.a;}
    static void Break(const Transform& v,Vec3& position,Vec3& rotation,Vec3& scale){position=v.position;rotation=v.rotation;scale=v.scale;}
    static void Break(const HitResult& v,bool& hit,Vec3& position,Vec3& normal,Actor*& actor){hit=v.hit;position=v.position;normal=v.normal;actor=v.actor;}
    static void SetMembers(Vec2& value,const Vec2& members,unsigned mask){Check(mask,3);if(mask&1)value.x=members.x;if(mask&2)value.y=members.y;}
    static void SetMembers(Vec3& value,const Vec3& members,unsigned mask){Check(mask,7);if(mask&1)value.x=members.x;if(mask&2)value.y=members.y;if(mask&4)value.z=members.z;}
    static void SetMembers(Color& value,const Color& members,unsigned mask){Check(mask,15);if(mask&1)value.r=members.r;if(mask&2)value.g=members.g;if(mask&4)value.b=members.b;if(mask&8)value.a=members.a;}
    static void SetMembers(Transform& value,const Transform& members,unsigned mask){Check(mask,7);if(mask&1)value.position=members.position;if(mask&2)value.rotation=members.rotation;if(mask&4)value.scale=members.scale;}
    static void SetMembers(HitResult& value,const HitResult& members,unsigned mask){Check(mask,15);if(mask&1)value.hit=members.hit;if(mask&2)value.position=members.position;if(mask&4)value.normal=members.normal;if(mask&8)value.actor=members.actor;}
    template<class T> static T WithMembers(T value,const T& members,unsigned mask){SetMembers(value,members,mask);return value;}
    template<class T> static T Select(bool condition,const T& whenTrue,const T& whenFalse){return condition?whenTrue:whenFalse;}
    static int Switch(const std::vector<int>& cases,int selection){const auto i=std::find(cases.begin(),cases.end(),selection);return i==cases.end()?-1:static_cast<int>(i-cases.begin());}
    static int Switch(const std::vector<std::string>& cases,const std::string& selection,bool caseSensitive=true){for(size_t i=0;i<cases.size();i++)if(Equal(cases[i],selection,caseSensitive))return static_cast<int>(i);return -1;}
    static bool Equal(const std::string& a,const std::string& b,bool caseSensitive=false){if(a.size()!=b.size())return false;for(size_t i=0;i<a.size();i++){const auto fold=[caseSensitive](unsigned char c){return !caseSensitive&&c>=65&&c<=90?c+32:c;};if(fold(a[i])!=fold(b[i]))return false;}return true;}
private:
    static void Check(unsigned mask,unsigned supported){if(mask&~supported)throw std::runtime_error("unknown struct member mask");}
};
}

#include <HBEngine/Struct.hpp>
#include <cassert>
#include <iostream>
struct Damage {int amount=42;hb::Vec3 direction{1,2,3};};
struct Stats {Damage hit;std::string label="체력";std::vector<Damage> history;};
int main(){
 const auto value=hb::Struct::Make<Damage>(9,hb::Vec3{0,1,0});
 const auto [amount,direction]=hb::Struct::Break(value,&Damage::amount,&Damage::direction);
 assert(amount==9&&direction.y==1);
 Stats original{},source{{77,{4,5,6}},"새 체력",{{12,{0,0,1}}}};
 auto changed=hb::Struct::WithMembers(original,source,&Stats::hit,&Stats::history);
 assert(changed.hit.amount==77&&changed.label=="체력"&&changed.history[0].amount==12);
 changed.history[0].amount=14;assert(source.history[0].amount==12);
 hb::Struct::SetMembers(original,source,&Stats::label);assert(original.hit.amount==42&&original.label=="새 체력");
 float x=0,y=0,z=0;hb::Struct::Break(hb::Struct::Make(1.f,2.f,3.f),x,y,z);assert(x==1&&y==2&&z==3);
 auto vector=hb::Struct::WithMembers(hb::Vec3{1,2,3},hb::Vec3{4,5,6},2);assert(vector.x==1&&vector.y==5&&vector.z==3);
 std::cout<<"custom aggregate Make/Break/selected members, detached nested copies, existing builtins passed\n";
}

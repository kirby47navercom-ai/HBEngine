#pragma once
#include <nlohmann/json.hpp>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <algorithm>
#include <cstdint>
#include <stdexcept>

namespace hb::detail {
inline constexpr std::size_t tileEditCellBudget=262144;
using TileCoordinate=std::uint64_t;
inline TileCoordinate tileKey(TileCoordinate x,TileCoordinate y,TileCoordinate width){return y*width+x;}
inline nlohmann::json sparseTileFill(const nlohmann::json& map,const nlohmann::json& tiles,TileCoordinate x0,TileCoordinate y0,TileCoordinate x1,TileCoordinate y1,int index,bool flood){
 using Json=nlohmann::json;
 const auto width=map.at("width").get<TileCoordinate>(),height=map.at("height").get<TileCoordinate>();
 if(!width||!height||width>9007199254740991ULL/height||x0>=width||x1>=width||y0>=height||y1>=height)throw std::runtime_error("invalid sparse tile dimensions");
 std::unordered_map<TileCoordinate,int> changes;
 if(flood){
  std::unordered_map<TileCoordinate,int> occupied;occupied.reserve(tiles.size());for(const auto& t:tiles)occupied[tileKey(t.at("x"),t.at("y"),width)]=t.at("index");
  const auto first=tileKey(x0,y0,width);const auto start=occupied.find(first);const int source=start==occupied.end()?-1:start->second;if(source==index)return tiles;
  std::vector<TileCoordinate> queue{first};std::unordered_set<TileCoordinate> visited{first};
  for(std::size_t cursor=0;cursor<queue.size();cursor++){
   const auto at=queue[cursor];const auto found=occupied.find(at);if((found==occupied.end()?-1:found->second)!=source)continue;
   if(changes.size()>=tileEditCellBudget)throw std::runtime_error("tile edit transient budget exceeded");
   changes[at]=index;
   const auto x=at%width,y=at/width;const auto visit=[&](TileCoordinate n){if(visited.insert(n).second)queue.push_back(n);};
   if(x)visit(at-1);
   if(x+1<width)visit(at+1);
   if(y)visit(at-width);
   if(y+1<height)visit(at+width);
  }
 }else{
  if(x0>x1)std::swap(x0,x1);
  if(y0>y1)std::swap(y0,y1);
  if((x1-x0+1)>tileEditCellBudget/(y1-y0+1))throw std::runtime_error("tile edit transient budget exceeded");
  for(auto y=y0;y<=y1;y++)for(auto x=x0;x<=x1;x++)changes[tileKey(x,y,width)]=index;
 }
 Json result=Json::array();bool changed=false;
 for(const auto& tile:tiles){const auto key=tileKey(tile.at("x"),tile.at("y"),width);const auto found=changes.find(key);if(found==changes.end()){result.push_back(tile);continue;}const int next=found->second;changes.erase(found);if(next==tile.at("index").get<int>())result.push_back(tile);else{changed=true;if(next>=0)result.push_back({{"x",key%width},{"y",key/width},{"index",next}});}}
 for(const auto& [key,value]:changes)if(value>=0){changed=true;result.push_back({{"x",key%width},{"y",key/width},{"index",value}});}
 if(!changed)return tiles;
 std::sort(result.begin(),result.end(),[](const Json& a,const Json& b){return a.at("y")==b.at("y")?a.at("x").template get<TileCoordinate>()<b.at("x").template get<TileCoordinate>():a.at("y").template get<TileCoordinate>()<b.at("y").template get<TileCoordinate>();});return result;
}
}

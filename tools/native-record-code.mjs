export function nativeRecordWorkerTypes(metadata,{pack,unpack}){
 const definitions=metadata.structs||[];if(!definitions.length)return '';
 const statements=(definition,index)=>{
  const type=definition.name,fields=definition.fields;
  const packed=fields.map(field=>'{' +JSON.stringify(field.name)+','+pack(field,'value.'+field.name)+'}').join(',');
  const decode=fields.map(field=>{
   const json='json.at('+JSON.stringify(field.name)+')',cpp='std::decay_t<decltype(value.'+field.name+')>';
   const check=field.array?`if(!${json}.is_array()||${json}.size()>100000)throw std::runtime_error("native record array range");for(const auto& item:${json})if(!hb_native::ValidValue(${JSON.stringify(field.type)},item,hb::bridgeWorldData))throw std::runtime_error("native record field type");`:`if(!hb_native::ValidValue(${JSON.stringify(field.type)},${json},hb::bridgeWorldData))throw std::runtime_error("native record field type");`;
   const value=field.type==='record'||field.enumName||field.type==='object'?unpack(field,json):`${json}.get<${cpp}>()`;
   return check+`value.${field.name}=${value};if(!HB_recordFinite(value.${field.name}))throw std::runtime_error("native record converted number range");`;
  }).join('');
  return `static_assert(std::is_aggregate_v<${type}>&&std::is_copy_constructible_v<${type}>&&std::is_copy_assignable_v<${type}>,"HB_STRUCT must be a copyable value aggregate");
template<> hb::Json HB_packRecord<${type}>(const ${type}& value){return hb::Json{${packed}};}
template<> ${type} HB_unpackRecord<${type}>(const hb::Json& json){if(!json.is_object()||json.size()!=${fields.length})throw std::runtime_error("native record fields required");${type} value{};${decode}return value;}
`;
 };
 return `template<class T> static hb::Json HB_packRecord(const T&);
template<class T> static T HB_unpackRecord(const hb::Json&);
${definitions.map(definition=>`template<> hb::Json HB_packRecord<${definition.name}>(const ${definition.name}&);\ntemplate<> ${definition.name} HB_unpackRecord<${definition.name}>(const hb::Json&);`).join('\n')}
template<class T> static hb::Json HB_packRecords(const std::vector<T>& values){auto json=hb::Json::array();for(const auto& value:values)json.push_back(HB_packRecord<T>(value));return json;}
template<class T> static std::vector<T> HB_unpackRecords(const hb::Json& json){if(!json.is_array()||json.size()>100000)throw std::runtime_error("native record array range");std::vector<T> values;values.reserve(json.size());for(const auto& value:json)values.push_back(HB_unpackRecord<T>(value));return values;}
template<class T> static bool HB_recordFinite(const T& value){if constexpr(std::is_floating_point_v<T>)return std::isfinite(value);else return true;}
static inline bool HB_recordFinite(const hb::Vec2& value){return std::isfinite(value.x)&&std::isfinite(value.y);}
static inline bool HB_recordFinite(const hb::Vec3& value){return std::isfinite(value.x)&&std::isfinite(value.y)&&std::isfinite(value.z);}
static inline bool HB_recordFinite(const hb::Color& value){return std::isfinite(value.r)&&std::isfinite(value.g)&&std::isfinite(value.b)&&std::isfinite(value.a);}
static inline bool HB_recordFinite(const hb::Transform& value){return HB_recordFinite(value.position)&&HB_recordFinite(value.rotation)&&HB_recordFinite(value.scale);}
static inline bool HB_recordFinite(const hb::HitResult& value){return HB_recordFinite(value.position)&&HB_recordFinite(value.normal);}
template<class T> static bool HB_recordFinite(const std::vector<T>& values){for(const auto& value:values)if(!HB_recordFinite(value))return false;return true;}
${definitions.map(statements).join('\n')}`;
}

export function packagedModuleError(file,error){
 const missing=error?.code==='ENOENT',blocked=['EACCES','EPERM','UNKNOWN'].includes(error?.code);
 if(!missing&&!blocked)return error;
 const message=missing?'게임의 C++ 실행 파일을 찾을 수 없어요. 배포 파일 누락 또는 백신 격리 여부를 확인하세요.':'게임의 C++ 실행 파일 실행이 차단됐어요. Windows 보안·백신의 보호 기록과 파일 권한을 확인하세요.';
 return Object.assign(new Error(message+'\n파일: '+file+'\n배포 압축 파일 전체를 다시 확인하고, 보호 기록의 탐지명을 제작자에게 전달해 주세요.',{cause:error}),{code:missing?'HB_PACKAGE_MODULE_MISSING':'HB_PACKAGE_MODULE_BLOCKED',file});
}

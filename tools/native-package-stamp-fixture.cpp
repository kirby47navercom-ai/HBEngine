#define NOMINMAX
#include <windows.h>
#include <objbase.h>
#include <filesystem>
#include <fstream>
#include <regex>
#include <vector>
#include <limits>
#include <iostream>
namespace fs=std::filesystem;
#include "WindowsGameIdentity.hpp"
int wmain(int argc,wchar_t** argv){try{if(argc!=3)return 2;stampGameExecutable(argv[1],argv[2]);return 0;}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}

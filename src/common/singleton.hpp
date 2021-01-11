#include <iostream>
#pragma once


template <typename T, typename Context>
class Singleton
{
public:
	static T *getInstance(Context);
private:
	Singleton() {}
	static T *instance;
};

template <typename T, typename Context>
T* Singleton<T, Context>::instance = 0;

template <typename T, typename Context>
T* Singleton<T, Context>::getInstance(Context context) {
		if(!instance) {
			instance = new T{context};
			return instance;
		}
		else {
			return instance;
		}
}

FROM ubuntu:xenial

# Install the JDK
# We are going to need some 32 bit binaries because aapt (Android Asset
# Packaging Tool) requires it
# file is need by the script that creates NDK toolchains
ENV DEBIAN_FRONTEND noninteractive
RUN dpkg --add-architecture i386 && \
    apt-get update -qq && \
    apt-get install -y \
      autoconf \
      automake \
      build-essential \
      bsdmainutils \
      curl \
      file \
      git \
      lsof \
      libc6:i386 \
      libconfig++9v5 \
      libgcc1:i386 \
      libncurses5:i386 \
      libstdc++6:i386 \
      libz1:i386 \
      python \
      python-dev \
      s3cmd \
      software-properties-common \
      strace \
      unzip \
      wget \
      zip && \
    echo oracle-java6-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections && \
    add-apt-repository -y ppa:webupd8team/java && \
    apt-get update -qq && \
    apt-get install -y oracle-java8-installer && \
    rm -rf /var/cache/oracle-jdk8-installer && \
    apt-get clean

# Install NVM (based on https://stackoverflow.com/questions/25899912/install-nvm-in-docker)

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 6.5.0

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH

ENV NPM_CONFIG_UNSAFE_PERM true

# Locales
RUN locale-gen en_US.UTF-8
ENV LANG "en_US.UTF-8"
ENV LANGUAGE "en_US.UTF-8"
ENV LC_ALL "en_US.UTF-8"

# Install the Android SDK
ENV ANDROID_SDK_VERSION r24.4.1
RUN cd /opt && curl -s https://dl.google.com/android/android-sdk_${ANDROID_SDK_VERSION}-linux.tgz | tar -xz
ENV ANDROID_HOME /opt/android-sdk-linux
ENV PATH ${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/platform-tools
RUN echo y | android update sdk --no-ui --all --filter tools > /dev/null && \
    echo y | android update sdk --no-ui --all --filter platform-tools | grep 'package installed' && \
    echo y | android update sdk --no-ui --all --filter build-tools-23.0.1 | grep 'package installed' && \
    echo y | android update sdk --no-ui --all --filter extra-android-m2repository | grep 'package installed' && \
    echo y | android update sdk --no-ui --all --filter android-23 | grep 'package installed'

# Install the Android NDK
ENV ANDROID_NDK_VERSION r10e
RUN cd /opt && \
    curl -sO http://dl.google.com/android/repository/android-ndk-${ANDROID_NDK_VERSION}-linux-x86_64.zip && \
    unzip -q android-ndk-${ANDROID_NDK_VERSION}-linux-x86_64.zip && \
    rm android-ndk-${ANDROID_NDK_VERSION}-linux-x86_64.zip
ENV ANDROID_NDK /opt/android-ndk-${ANDROID_NDK_VERSION}

RUN cd /opt && \
    git clone https://github.com/facebook/watchman.git && \
    cd watchman && \
    git checkout v4.7.0 && \
    ./autogen.sh && ./configure && \
    make && make install

RUN . $NVM_DIR/nvm.sh && nvm use default && npm install -g react-native-cli

FROM ubuntu:xenial

# Install the JDK
# We are going to need some 32 bit binaries because aapt requires it
# file is need by the script that creates NDK toolchains
ENV DEBIAN_FRONTEND noninteractive
RUN dpkg --add-architecture i386 && \
    apt-get update -qq && \
    apt-get install -y file git curl wget zip unzip bsdmainutils strace lsof \
                       build-essential libc6:i386 software-properties-common \
                       libstdc++6:i386 libgcc1:i386 libncurses5:i386 libz1:i386 \
                       s3cmd libconfig++9v5 python build-essential && \
    curl -sL https://deb.nodesource.com/setup_4.x | bash - && \
    apt-get install -y nodejs && \
    echo oracle-java6-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections && \
    add-apt-repository -y ppa:webupd8team/java && \
    apt-get update -qq && \
    apt-get install -y oracle-java8-installer && \
    rm -rf /var/cache/oracle-jdk8-installer && \
    apt-get clean

ENV NPM_CONFIG_UNSAFE_PERM true

# Locales
RUN locale-gen en_US.UTF-8
ENV LANG "en_US.UTF-8"
ENV LANGUAGE "en_US.UTF-8"
ENV LC_ALL "en_US.UTF-8"

# ENV PATH ${PATH}:${NDK_HOME}

# Install writable dir
RUN mkdir /tmp/opt && chmod 777 /tmp/opt


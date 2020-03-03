FROM ubuntu:18.04

ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm

# This forces dpkg not to call sync() after package extraction and speeds up install
RUN echo "force-unsafe-io" > /etc/dpkg/dpkg.cfg.d/02apt-speedup

# No need for the apt cache in a container
RUN echo "Acquire::http {No-Cache=True;};" > /etc/apt/apt.conf.d/no-cache

# Install clang and everything needed to build core
RUN apt-get update \
    && apt-get install -y \
       curl \
       jq \
       libprocps-dev \
       libconfig-dev \
       ninja-build \
       gcc-8 \
       g++-8 \
       git \
       gnupg \
       perl \
       tar \
       wget

RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-8 20
RUN update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-8 20

RUN cd /opt \
    && wget -nv https://cmake.org/files/v3.15/cmake-3.15.2-Linux-x86_64.tar.gz \
    && tar zxf cmake-3.15.2-Linux-x86_64.tar.gz

ENV PATH "/opt/cmake-3.15.2-Linux-x86_64/bin:$PATH"

RUN curl -SL https://www.openssl.org/source/openssl-1.1.1b.tar.gz | tar -zxC / \
 && cd /openssl-1.1.1b \
 && ./config --prefix=/usr \
 && make && make install \
 && rm -rf /openssl-1.1.1b \
 && cd /tmp

RUN mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 8.15.0 \
 && nvm install 10.15.1 \
 && chmod a+rwX -R $NVM_DIR

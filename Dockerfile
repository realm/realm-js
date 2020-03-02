FROM ubuntu:18.04

USER root

ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm

# One dependency per line in alphabetical order.
# This should help avoiding duplicates and make the file easier to update.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    build-essential \
    curl \
    gcovr \
    git \
    gcc-7 \
    g++-7 \
    jq \
    lcov \
    libprocps-dev \
    make \
    ninja-build \
    openssh-client \
    perl \
    python-matplotlib \
    pkg-config \
    s3cmd \
    tar \
    unzip \
    valgrind \
    wget \
    && rm -rf /var/lib/apt/lists/*

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
    && chmod a+rwX -R $NVM_DIR \

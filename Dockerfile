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
       git \
       gnupg \
       perl \
       tar \
       wget

# Setup the LLVM repository
RUN echo deb http://apt.llvm.org/bionic/ llvm-toolchain-bionic-9 main > /etc/apt/sources.list.d/clang.list
# Download the GPG key to use the LLVM repo
ADD https://apt.llvm.org/llvm-snapshot.gpg.key /tmp/llvm.key

# Add the key
RUN apt-key add /tmp/llvm.key

RUN apt-get update \
    && apt-get install -y clang-9 clang-format-9 \
    && rm -rf /var/lib/apt/lists/*

# Make clang the default compiler
ENV CC clang
ENV CXX clang++
RUN ln -s /usr/bin/clang-9 /usr/bin/clang \
 && ln -s /usr/bin/clang++-9 /usr/bin/clang++ \
 && ln -s /usr/bin/clang-format-9 /usr/bin/clang-format \
 && ln -s /usr/bin/git-clang-format-9 /usr/bin/git-clang-format

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

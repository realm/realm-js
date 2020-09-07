FROM debian:10

RUN dpkg --add-architecture armhf && apt-get update
RUN apt-get install -y \
        build-essential \
        curl \
        crossbuild-essential-armhf \
        git \
        libprocps-dev:armhf \
        libssl-dev:armhf \
        libz-dev:armhf \
        libasio-dev \
        ninja-build \
        nodejs \
        libnode-dev:armhf \
        npm \
        qemu-user


ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm
RUN mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 10 \
 && nvm install 12 \
 && nvm install 13 \
 && nvm install 14 \
 && chmod a+rwX -R $NVM_DIR

FROM ubuntu:xenial

RUN apt-get update && \
    apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_4.x | bash - && \
    apt-get install -y nodejs gcc-4.9 python build-essential

ENV NPM_CONFIG_UNSAFE_PERM true

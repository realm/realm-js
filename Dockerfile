FROM centos/devtoolset-7-toolchain-centos7

USER root

ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm

RUN yum -y install \
    chrpath \
    jq \
    libconfig-devel \
    make \
    perl \
    which \
    openssh-clients \
    xorg-x11-server-Xvfb \
    libXScrnSaver \
    gtk3 \
    alsa-lib \
 && yum clean all \
 \
  # TODO: install openssl in /usr/local
 && curl -SL https://www.openssl.org/source/openssl-1.1.1b.tar.gz | tar -zxC / \
 && cd /openssl-1.1.1b \
 && ./config --prefix=/usr \
 && make && make install \
 && rm -rf /openssl-1.1.1b \
 && cd /tmp \
 \
 && mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 8.15.0 \
 && nvm install 10.15.1 \
 && chmod a+rwX -R $NVM_DIR \

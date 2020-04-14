FROM centos/devtoolset-7-toolchain-centos7

USER root

# workaround for https://github.com/jenkinsci/docker/issues/519
ENV GIT_COMMITTER_NAME=ci
ENV GIT_COMMITTER_EMAIL=ci@realm.io

ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm

#Install git from scl
RUN yum -y install centos-release-scl rh-git29 && \
    scl enable rh-git29 bash which git && git --version


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
    #git \
 && yum clean all \
  \
  # TODO: install openssl in /usr/local
 && curl -SL https://www.openssl.org/source/openssl-1.0.2k.tar.gz | tar -zxC / \
 && cd /openssl-1.0.2k \
 && ./Configure -DPIC -fPIC -fvisibility=hidden -fvisibility-inlines-hidden no-zlib-dynamic no-dso linux-x86_64 --prefix=/usr \
 && make && make install_sw \
 && rm -rf /openssl-1.0.2k \
 && cd /tmp \
 \
 && mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 10.19.0 \
 && nvm install 12.16.1 \
 && nvm install 13.0.0 \
 && chmod a+rwX -R $NVM_DIR


#Install and build git from source
# RUN yum -y remove git* \
# && yum -y install wget perl-CPAN gettext-devel perl-devel  openssl-devel  zlib-devel expat-devel curl-devel gcc perl-ExtUtils-MakeMaker autoconf automake\
# && wget https://github.com/git/git/archive/v2.26.0.tar.gz -O git.tar.gz \
# && tar -xvf git.tar.gz \
# && cd git-* \
# #RUN make configure ./configure --prefix=/usr/local
# && make prefix=/usr/local configure ./configure \ 
# && make prefix=/usr/local/git install \ 
# && git --version
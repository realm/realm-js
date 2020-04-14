FROM centos:7

RUN yum install -y centos-release-scl \
 && yum-config-manager --enable rhel-server-rhscl-7-rpms \
 && yum install -y yum install devtoolset-9 python27 rh-git218

ENV NPM_CONFIG_UNSAFE_PERM true
ENV NVM_DIR /tmp/.nvm

RUN yum -y install \
    chrpath \
    jq \
    libconfig-devel \
    openssh-clients \
    xorg-x11-server-Xvfb \
    libXScrnSaver \
    gtk3 \
    alsa-lib \
 && yum clean all \
 \
  # TODO: install openssl in /usr/local
 && curl -SL https://www.openssl.org/source/openssl-1.0.2k.tar.gz | tar -zxC / \
 && cd /openssl-1.0.2k \
 && ./Configure -DPIC -fPIC -fvisibility=hidden no-zlib-dynamic no-dso linux-x86_64 --prefix=/usr \
 && make && make install_sw \
 && rm -rf /openssl-1.0.2k \
 && cd /tmp \
 \
 && mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 10 \
 && nvm install 12 \
 && nvm install 13 \
 && chmod a+rwX -R $NVM_DIR

ENV PATH /opt/rh/rh-git218/root/usr/bin:/opt/rh/python27/root/usr/bin:/opt/rh/devtoolset-9/root/usr/bin:$PATH

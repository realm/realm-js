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
 && yum clean all

RUN mkdir -p $NVM_DIR \
 && curl -s https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash \
 && . $NVM_DIR/nvm.sh \
 && nvm install 12 \
 && chmod a+rwX -R $NVM_DIR

ENV PATH /opt/rh/rh-git218/root/usr/bin:/opt/rh/python27/root/usr/bin:/opt/rh/devtoolset-9/root/usr/bin:$PATH
ENV LD_LIBRARY_PATH /opt/rh/httpd24/root/usr/lib64:/opt/rh/python27/root/usr/lib64:/opt/rh/devtoolset-9/root/usr/lib64:/opt/rh/devtoolset-9/root/usr/lib:/opt/rh/devtoolset-9/root/usr/lib64/dyninst:/opt/rh/devtoolset-9/root/usr/lib/dyninst:/opt/rh/devtoolset-9/root/usr/lib64:/opt/rh/devtoolset-9/root/usr/lib

# Ensure a new enough version of CMake is available.
RUN cd /opt \
    && curl -O -J https://cmake.org/files/v3.15/cmake-3.15.2-Linux-x86_64.tar.gz \
    && tar zxf cmake-3.15.2-Linux-x86_64.tar.gz
ENV PATH "/opt/cmake-3.15.2-Linux-x86_64/bin:$PATH"
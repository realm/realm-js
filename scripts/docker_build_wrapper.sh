#!/bin/bash

die() { echo "$@" 1>&2 ; exit 1; }
info() { echo "===> $*"; }

docker_build() {
  declare name="$1"; shift
  declare path="$1"; shift
  declare args="$*"

  info "Building ${name} image..."
  if [ "${DOCKER_REGISTRY}" != "" ]; then
    remote_name="${DOCKER_REGISTRY}/${name}"
    docker_pull "${remote_name}"
    args="${args} --cache-from \"${remote_name}\""
  fi

  old_id=$(docker images -q "${name}")
  info "Old ${name} image id: ${old_id}"

  docker build --cache-from "${name}" ${args} -t "${name}" "${path}" || \
      die "Building ${name} image failed"

  new_id=$(docker images -q "${name}")
  info "New ${name} image id: ${new_id}"

  if [ "${new_id}" != "${old_id}" ] && [ "${DOCKER_PUSH:-0}" != "0" ] && [ "${DOCKER_REGISTRY}" != "" ]; then
    docker tag "${name}" "${remote_name}"
    docker_push "${remote_name}"
  fi
}

docker_pull() {
  info "Attempting to pull '$1' image from registry..."
  docker pull "$1" || true
}

docker_push() {
  info "Pushing '$1' image to registry..."
  docker push "$1"
}

docker_build $@

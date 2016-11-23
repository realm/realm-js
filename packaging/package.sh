#!/bin/bash

set -e

script_path="$(pushd "$(dirname "$0")" >/dev/null; pwd)"
src_path="$(pushd "${script_path}/.." >/dev/null; pwd)"

. "${script_path}/functions.sh"


git_tag=$(git describe --exact-match --tags HEAD 2>/dev/null || true)

. "${src_path}/dependencies.list"

export PACKAGECLOUD_URL="https://${PACKAGECLOUD_MASTER_TOKEN}:@packagecloud.io/install/repositories/realm/sync-devel"

if [ -z "$git_tag" ]; then
  info "No git tag exists.  Triggering -devel build"
  sha=$(git rev-parse HEAD | cut -b1-8)
  ITERATION="0.$sha"
elif [ "$git_tag" != "v${VERSION}" ]; then
  die "Git tag '$git_tag' does not match VERSION: '$VERSION'"
else
  info "Found git tag: '$git_tag'. Triggering release build"
  ITERATION="${BUILD_NUMBER:-1}"
fi

rm -rf "${src_path}/packaging/out"; mkdir -p "${src_path}/packaging/out"

cp "${src_path}/dependencies.list" "${src_path}/packaging/out/packaging.list"
cat <<-EOD >> "${src_path}/packaging/out/packaging.list"
ITERATION=$ITERATION
EXTRA_NPM_ARGUMENTS=$EXTRA_NPM_ARGUMENTS
EOD

env_file="${src_path}/packaging/out/packaging.list"

default="centos-6 centos-7 ubuntu-1604"
for distro in ${*:-$default}; do
  distro_path="${src_path}/packaging/${distro}"
  image_name="ci/${PACKAGE_NAME}:${distro}"

  mkdir -p "${src_path}/packaging/out/$distro"
  rm -f "${src_path}/packaging/out/$distro/*"

  mkdir -p "${src_path}/packaging/test-logs/$distro"
  rm -f "${src_path}/packaging/test-logs/$distro/*"

  docker_build "${image_name}-base" "${distro_path}/base-image" \
      --build-arg "PACKAGECLOUD_URL=$PACKAGECLOUD_URL"

  docker_build "${image_name}-build" "${distro_path}/build-image" 

  info "Running '$distro' build..."
  docker run \
    --env-file "${env_file}" \
    --rm \
    -v "${src_path}/packaging/${distro}/files:/files:ro,z" \
    -v "${src_path}/packaging/${distro}/build-image/inside:/inside:ro,z" \
    -v "${src_path}:/source:ro,z" \
    -v "${src_path}/packaging/common:/common:ro,z" \
    -v "${src_path}/packaging/out/${distro}:/out:z" \
    -w /inside "${image_name}-build" \
    || die "Build phase for '$distro' failed."

  docker_build "${image_name}-test" "${distro_path}/test-image"

  info "Running '$distro' tests..."
  docker run \
      --env-file "${env_file}" \
      --rm \
      -v "${src_path}/packaging/${distro}/test-image/inside:/inside:ro,z" \
      -v "${src_path}/packaging/out/${distro}:/out:z" \
      -v "${src_path}/packaging/test-logs/${distro}:/test-logs:z" \
      -v "${src_path}/packaging/common:/common:ro,z" \
      -w /inside "${image_name}-test" \
      || die "Test phase for '$distro' failed."

  info "Test phase for '$distro' succeeded."
done

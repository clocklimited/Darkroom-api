#!/bin/bash

### This is a lean version of the 2.1.0-to-3.0.0.sh script, which uses hardlinks instead of mv.
### You MUST fully understand this script, and set the DR_PATH and MIG_DIR variables 
### appropriately before removing the `exit` and running.

### You should verify all the images are named correctly before running this, with this command:
### find -type f | egrep -v "[0-9a-f]{32}"/image

exit

DR_PATH="/tank/data-application/darkroom.shortlist.com/"
MIG_DIR="darkroom.shortlist.com-migrated"
MIG_PATH="${DR_PATH}/../${MIG_DIR}/"

cd "${DR_PATH}"
mkdir -pv "../${MIG_DIR}/images/"

>&2 echo "Step 1. Creating new subdirectories"
for (( i = 0; i <= 4095; i++ )); do
  new_path="${MIG_PATH}/images/$(printf "%.3x\n" $i)"
  if [[ ! -d "${new_path}" ]]; then
    mkdir ${new_path}
  fi
done

>&2 echo "Step 2. Hard linking files from 2.1 to 3.0 format"
find . -type f -name image | while read old_image; do
  link_name="${DR_PATH}/../${MIG_DIR}/images/${old_image:9:3}/${old_image:9:32}"
  if [[ ! -f "${link_name}" ]]; then
    ln -v "${old_image}" "${link_name}"
  fi
done


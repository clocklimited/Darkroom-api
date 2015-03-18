#!/bin/bash
#
# Migration script to move data files from Darkroom-api v1/v2 format to v3 format.
#
# Run without options to see usage statement.
#
# Original author: Rob Noake <rob.noake@clock.co.uk>

## FUNCTIONS ##
# Wrapper to either run a command, or when in pretend mode, echo it out to shell.
#
# Args:
#  $1 = Command to run
#
# Command output is not returned, however the return code will be.
run_command() {
  local cmd=$1
  if [[ ! -z "${PRETEND}" ]]; then
    echo "${cmd}"
  else
    $cmd
    return $?
  fi
}

#
# Show usage statement
#
show_help() {
  >&2 echo "Usage: $0 -d /path/to/darkroom/images [-p]"
  >&2 echo "    -d dir      Path to darkroom 'images' directory"
  >&2 echo "    -g group    Group to own darkroom files (Default: developer)"
  >&2 echo "    -o owner    User to own darkroom files (Default: node)"
  >&2 echo "    -p          Pretend mode: echos commands instead of executing them"
}

# Set default file owner/group
DR_OWNER=node
DR_GROUP=developer

# Parse incoming options
# See usage statement for meanings
while getopts "d:g:ho:p" opt; do
  case ${opt} in
    d)
      DR_PATH=${OPTARG}
      ;;
    g)
      DR_GROUP=${OPTARG}
      ;;
    h)
      show_help
      exit 0
      ;;
    o)
      DR_OWNER=${OPTARG}
      ;;
    p)
      PRETEND=1
      ;;
    # Handle invalid arguments
    \?)
      >&2 echo "Invalid option: -${OPTARG}"
      exit 1
      ;;
    :)
      >&2 echo "Option requires argument: -${OPTARG}"
      exit 1
      ;;
  esac
done

# Make sure -d was passed with a path, and that path is a directory.
if [[ -z "${DR_PATH}" ]]; then
  show_help
  exit 1
fi

if [[ ! -d "$DR_PATH" ]]; then
  >&2 echo "ERROR: Not a directory: ${DR_PATH}"
  exit 1
fi

if [[ ! $(getent passwd "${DR_OWNER}") ]]; then
  >&2 echo "ERROR: Target file owner ${DR_OWNER} does not exist"
  exit 1
fi

if [[ ! $(getent group "${DR_GROUP}") ]]; then
  >&2 echo "ERROR: Target file group ${DR_GROUP} does not exist"
  exit 1
fi


# Check if we are on an NFS share. If we are, stop. This generates a ton of I/O and should be
# done on the server.
df -P -T "${DR_PATH}" | tail -n +2 | awk '{print $2}' | grep -q nfs

if [[ "$?" == 0 ]]; then
  >&2 "ERROR: You are trying to run this on an NFS/GlusterFS client."
  >&2 "       This script generates a lot of IO and will not be performant on networked file systems."
  >&2 "       Please copy this script to the server and run there."
  exit 1
fi

# Set IO to slowest "best effort" level
if [[ -z "${PRETEND}" ]]; then
  # We either need to provide PID or command. Since we run a lot of commands,
  # this cannot be simulated in pretend mode and work if someone takes the output as a script.
  run_command "ionice -c2 -n7 -p $$"
else
  >&2 echo "WARNING: In pretend mode, skipping call to ionice"
  >&2 echo "         If you plan to run as a script, prefix your script invocation with: ionice -c2 -n7"
fi

>&2 echo "Step 1. Creating new subdirectories"
for (( i = 0; i <= 4095; i++ )); do
  new_path="${DR_PATH}/$(printf "%.3x\n" $i)"
  if [[ ! -d "${new_path}" ]]; then
    run_command "mkdir ${new_path}"
  fi
done

>&2 echo "Step 2. Moving files from 2.1 to 3.0 format"
find "${DR_PATH}" -type f -name image | while read old_image; do
  old_dir=$(dirname ${old_image} | xargs -L1 basename)
  prefix=$(echo "${old_dir}" | cut -c 1-3)

  run_command "mv $old_image ${DR_PATH}/${prefix}/${old_dir}"
#  run_command "rmdir ${DR_PATH}/${old_dir}"
done

# Removing old, empty directores that we might have missed (e.g. because they were already empty)
>&2 echo "Step 3. Removing empty 2.1-style subdirectories."
run_command "sudo -n find ${DR_PATH} -mindepth 1 -type d -regextype sed -regex .*/[0-9a-f]\{32\}\$ -empty -delete"

# Fix ownership
>&2 echo "Step 4. Setting file ownership on data files."
run_command "sudo -n chown ${DR_OWNER}:${DR_GROUP} -R ${DR_PATH}"

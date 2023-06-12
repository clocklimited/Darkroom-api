#!/bin/sh

if [ 0${MOSS} -gt 0 ]; then
  echo "Setting max-old-space-size to ${MOSS}, based on env var"
else
  # max-old-space-size defaults, in case NF_ vars not present
  MOSS_CPU=${NF_CPU_RESOURCES:-1}
  MOSS_RAM=${NF_RAM_RESOURCES:-1400}

  # If num CPUs is less than 1, round up.
  case $MOSS_CPU in
    "0."*) MOSS_CPU=1
  esac

  # Magic formula written by Jack Burgess.
  MOSS=$(echo "$MOSS_RAM * 0.75 / $MOSS_CPU" | bc)

  echo "Setting max-old-space-size to ${MOSS}, based on ${MOSS_CPU} CPU(s) and ${MOSS_RAM}MB RAM"
fi

exec node --max-old-space-size=${MOSS} "$@"


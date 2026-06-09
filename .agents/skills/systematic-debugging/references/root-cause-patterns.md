# Root Cause Patterns

## Error Appears Deep In The Stack

Likely missing evidence:

- caller that supplied the bad value
- data conversion or defaulting layer
- lifecycle ordering
- async boundary

Next probe:

- trace the value backward one caller at a time
- compare with a working call path
- inspect where defaults enter

## CI Fails But Local Passes

Likely missing evidence:

- environment variables
- OS or shell differences
- dependency cache or lockfile drift
- path/case sensitivity
- missing generated files

Next probe:

- print versions and relevant env keys, not secret values
- compare lockfiles and install command
- reproduce with the CI command locally if possible

## Test Is Flaky Or Order-Dependent

Likely missing evidence:

- shared global state
- unawaited async work
- leaked timers, network handles, or file handles
- persistent storage not reset
- parallel test interference

Next probe:

- run test alone, then in shuffled groups
- use `find-polluter.sh` when available
- replace arbitrary sleeps with condition-based waits

## Fixes Keep Creating New Failures

Likely missing evidence:

- wrong abstraction boundary
- duplicated logic with conflicting sources of truth
- hidden coupling through globals, filesystem, cache, or implicit config
- code concentrated in a file that now has too many responsibilities

Next probe:

- pause local patching
- map ownership and dependency direction
- use `codex-architecture-governance` before another fix attempt

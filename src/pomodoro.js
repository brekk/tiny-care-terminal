import {freeze} from 'f-utility'

const STATES = freeze({
  RUNNING: `running`,
  STOPPED: `stopped`,
  IN_BREAK: `in_break`,
  PAUSED: `paused`
})

// options (object)
// options.onTick (function) -  Runs on every tick
// options.onBreakStarts (function) - Runs when break starts
// options.onBreakEnds (function) - Runs when break ends
const pomodoro = (options) => {
  let _setIntervalId = null
  let _runningDuration = 20 // Default pomodoro duration: 20 Min
  let _breakDuration = 5 // Default break duration: 5 Min
  let _runningDurationRemaining = 0 // In seconds
  let _breakDurationRemaining = 0 // In seconds
  let _currentState = STATES.STOPPED

  let _onTick = () => {
    switch (_currentState) {
    case STATES.RUNNING: _handleTickOnRunning(); break
    case STATES.IN_BREAK: _handleTickOnBreak(); break
    case STATES.STOPPED: _handleTickOnStopped(); break
    case STATES.PAUSED:
    }
  }

  const _handleTickOnRunning = () => {
    if (_runningDurationRemaining < 1) {
      _runningDurationRemaining = 0
      _breakDurationRemaining = _breakDuration * 60
      _currentState = STATES.IN_BREAK
      options.onBreakStarts && options.onBreakStarts()
    } else {
      _runningDurationRemaining -= 1
      if (options.onTick) options.onTick()
    }
  }

  const _handleTickOnBreak = () => {
    if (_breakDurationRemaining < 1) {
      _breakDurationRemaining = 0
      _runningDurationRemaining = _runningDuration * 60
      _currentState = STATES.RUNNING
      options.onBreakEnds && options.onBreakEnds()
    } else {
      _breakDurationRemaining -= 1
      if (options.onTick) options.onTick()
    }
  }

  const _handleTickOnStopped = () => {
    clearInterval(_setIntervalId)
    _runningDurationRemaining = 0
    _breakDurationRemaining = 0
    _setIntervalId = null
  }

  let exports = {
    start: () => {
      if (_setIntervalId !== null) clearInterval(_setIntervalId)
      _runningDurationRemaining = _runningDuration * 60
      _setIntervalId = setInterval(_onTick, 1000)
      _currentState = STATES.RUNNING
    },

    stop: () => {
      _currentState = STATES.STOPPED
    },

    pause: () => {
      _currentState = STATES.PAUSED
    },

    resume: () => {
      _currentState = _breakDurationRemaining ? STATES.IN_BREAK : STATES.RUNNING
    },

    updateRunningDuration() {
      if (_runningDuration >= 60) _runningDuration = 1
      else _runningDuration += 1
    },

    updateBreakDuration() {
      if (_breakDuration >= 60) _breakDuration = 1
      else _breakDuration += 1
    },

    getRunningDuration() {
      return _runningDuration
    },

    getBreakDuration() {
      return _breakDuration
    },

    getRemainingTime() {
      let remainingTime
      switch (_currentState) {
      case STATES.RUNNING: remainingTime = _runningDurationRemaining; break
      case STATES.IN_BREAK: remainingTime = _breakDurationRemaining; break
      case STATES.STOPPED: remainingTime = _runningDuration * 60; break
      case STATES.PAUSED: remainingTime = _runningDurationRemaining || _breakDurationRemaining
      }
      return (`0` + Math.floor(remainingTime / 60)).slice(-2) + `:` +
        (`0` + remainingTime % 60).slice(-2)
    },

    isRunning() {
      return _currentState === STATES.RUNNING
    },

    isInBreak() {
      return _currentState === STATES.IN_BREAK
    },

    isPaused() {
      return _currentState === STATES.PAUSED
    },

    isStopped() {
      return _currentState === STATES.STOPPED
    }
  }

  return exports
}

module.exports = pomodoro

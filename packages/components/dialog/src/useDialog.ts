import { computed, ref, watch, nextTick, onMounted } from 'vue'

import { useLockScreen, useRestoreActive, useModal } from '@element-plus/hooks'
import { UPDATE_MODEL_EVENT } from '@element-plus/utils/constants'
import isServer from '@element-plus/utils/isServer'
import PopupManager from '@element-plus/utils/popup-manager'
import { clearTimer, isNumber } from '@element-plus/utils/util'
import { isValidWidthUnit } from '@element-plus/utils/validators'


import type { CSSProperties, ExtractPropTypes ,PropType, Ref, SetupContext } from 'vue'
import type { TimeoutHandle } from '@element-plus/utils/types'

export const CLOSE_EVENT = 'close'
export const OPEN_EVENT = 'open'
export const CLOSED_EVENT = 'closed'
export const OPENED_EVENT = 'opened'

export const useDialogEmits = [CLOSE_EVENT,
  CLOSED_EVENT,
  OPEN_EVENT,
  OPENED_EVENT,
  UPDATE_MODEL_EVENT,
]

export const useDialogProps = {
  appendToBody: {
    type: Boolean,
    default: false,
  },
  beforeClose: {
    type: Function as PropType<(...args: any[]) => unknown>,
  },
  destroyOnClose: {
    type: Boolean,
    default: false,
  },
  center: {
    type: Boolean,
    default: false,
  },
  customClass: {
    type: String,
    default: '',
  },
  closeOnClickModal: {
    type: Boolean,
    default: true,
  },
  closeOnPressEscape: {
    type: Boolean,
    default: true,
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
  lockScroll: {
    type: Boolean,
    default: true,
  },
  modal: {
    type: Boolean,
    default: true,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  openDelay: {
    type: Number,
    default: 0,
  },
  closeDelay: {
    type: Number,
    default: 0,
  },
  top: {
    type: String,
    default: '15vh',
  },
  modelValue: {
    type: Boolean,
    required: true,
  },
  modalClass: String,
  width: {
    type: [String, Number],
    default: '50%',
    validator: isValidWidthUnit,
  },
  zIndex: {
    type: Number,
  },
}

export default function(
  props: ExtractPropTypes<typeof useDialogProps>,
  ctx: SetupContext,
  targetRef: Ref<HTMLElement>,
) {
  const visible = ref(false)
  const closed = ref(false)
  const dialogRef = ref(null)
  const openTimer = ref<TimeoutHandle>(null)
  const closeTimer = ref<TimeoutHandle>(null)
  const rendered = ref(false) // when desctroyOnClose is true, we initialize it as false vise versa
  const zIndex = ref(props.zIndex || PopupManager.nextZIndex())
  const modalRef = ref<HTMLElement>(null)

  const normalizeWidth = () => {
    if(isNumber(props.width))
      return `${props.width}px`
    else
      return props.width
  }

  const style = computed(() => {
    const style = {} as CSSProperties
    if (!props.fullscreen) {
      style.marginTop = props.top
      if (props.width) {
        style.width = normalizeWidth()
      }
    }
    return style
  })

  function afterEnter() {
    ctx.emit(OPENED_EVENT)
  }

  function afterLeave() {
    ctx.emit(CLOSED_EVENT)
    ctx.emit(UPDATE_MODEL_EVENT, false)
    if (props.destroyOnClose) {
      rendered.value = false
    }
  }

  function beforeLeave() {
    ctx.emit(CLOSE_EVENT)
  }

  function open() {
    clearTimer(closeTimer)
    clearTimer(openTimer)
    if (props.openDelay && props.openDelay > 0) {
      openTimer.value = window.setTimeout(() => {
        openTimer.value = null
        doOpen()
      }, props.openDelay)
    } else {
      doOpen()
    }
  }

  function close() {
    // if (this.willClose && !this.willClose()) return;
    clearTimer(openTimer)
    clearTimer(closeTimer)

    if (props.closeDelay && props.closeDelay > 0) {
      closeTimer.value = window.setTimeout(() => {
        closeTimer.value = null
        doClose()
      }, props.closeDelay)
    } else {
      doClose()
    }
  }

  function hide(shouldCancel: boolean) {
    if (shouldCancel) return
    closed.value = true
    visible.value = false
  }

  function handleClose() {
    if (props.beforeClose) {
      props.beforeClose(hide)
    } else {
      close()
    }
  }

  function onModalClick() {
    if (props.closeOnClickModal) {
      handleClose()
    }
  }

  function doOpen() {
    if (isServer) {
      return
    }

    // if (props.willOpen?.()) {
    //  return
    // }
    visible.value = true
  }

  function doClose() {
    visible.value = false
  }

  if (props.lockScroll) {
    useLockScreen(visible)
  }

  if (props.closeOnPressEscape) {
    useModal({
      handleClose,
    }, visible)
  }

  useRestoreActive(visible)

  watch(() => props.modelValue, val => {
    if (val) {
      closed.value = false
      open()
      rendered.value = true // enables lazy rendering
      ctx.emit(OPEN_EVENT)
      zIndex.value = props.zIndex ? zIndex.value++ : PopupManager.nextZIndex()
      // this.$el.addEventListener('scroll', this.updatePopper)
      nextTick(() => {
        if (targetRef.value) {
          targetRef.value.scrollTop = 0
        }
      })
    } else {
      // this.$el.removeEventListener('scroll', this.updatePopper
      if (visible.value) {
        close()
      }
    }
  })

  onMounted(() => {
    if (props.modelValue) {
      visible.value = true
      rendered.value = true // enables lazy rendering
      open()
    }
  })

  return {
    afterEnter,
    afterLeave,
    beforeLeave,
    handleClose,
    onModalClick,
    closed,
    dialogRef,
    style,
    rendered,
    modalRef,
    visible,
    zIndex,
  }
}

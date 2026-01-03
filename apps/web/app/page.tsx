"use client"

import { useEffect, useState, useRef } from 'react'
import { usePollardRho } from '@/hooks/usePollardRho'
import { clearState } from '@/lib/storage'
import { parseShareLink, hasShareState, clearShareStateFromUrl } from '@/lib/share'
import { validatePublicKeyFormat } from '@/lib/pollard-rho'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, Share2, Zap, Pause, Play, RotateCcw, Check, Loader2 } from 'lucide-react'
import type { SpeedLevel } from '@/hooks/usePollardRho'

const SPEED_LABELS: Record<SpeedLevel, string> = {
  slow: '慢速',
  medium: '中速',
  fast: '快速',
  ultra: '极快',
}

const SPEED_LEVELS: SpeedLevel[] = ['slow', 'medium', 'fast', 'ultra']

export default function HomePage() {
  const [publicKey, setPublicKey] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [showShareSuccess, setShowShareSuccess] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)
  const hasRestoredRef = useRef(false)

  const {
    isRunning,
    isPaused,
    iteration,
    speed,
    speedLevel,
    logs,
    hasFoundKey,
    privateKey,
    start,
    pause,
    resume,
    reset,
    setSpeedLevel,
    generateShareLink,
    restoreFromState,
    formattedIteration,
    remainingTime,
  } = usePollardRho()

  // Check for saved state or shared state on mount
  useEffect(() => {
    if (hasRestoredRef.current) return

    const sharedData = hasShareState() ? parseShareLink() : null

    if (sharedData) {
      // Restore from share link in view mode (read-only)
      hasRestoredRef.current = true
      restoreFromState(sharedData)
      setPublicKey(sharedData.state.publicKey)
      setHasRestoredState(true)
      setIsViewMode(true)
      clearShareStateFromUrl()
    }
  }, [])

  const handleStart = () => {
    // Validate public key format before showing warning
    const cleanKey = publicKey.replace('0x', '').replace('0X', '').trim()
    if (!validatePublicKeyFormat(publicKey)) {
      alert('请输入有效的 Ed25519 公钥（64 位 hex 字符）')
      return
    }
    setShowWarning(true)
  }

  const handleStartFromView = () => {
    // Exit view mode and start fresh
    setIsViewMode(false)
    setHasRestoredState(false)
    setShowWarning(true)
  }

  const handleConfirmStart = async () => {
    console.log('[handleConfirmStart] Starting, isInitializing:', isInitializing)
    setShowWarning(false)
    setIsInitializing(true)
    console.log('[handleConfirmStart] Set isInitializing to true')

    try {
      console.log('[handleConfirmStart] About to call start()')
      await start(publicKey)
      console.log('[handleConfirmStart] start() returned')
    } catch (error) {
      console.error('[handleConfirmStart] Error:', error)
    } finally {
      console.log('[handleConfirmStart] Finally block, setting isInitializing to false')
      setIsInitializing(false)
      console.log('[handleConfirmStart] isInitializing set to false')
    }
    console.log('[handleConfirmStart] Done')
  }

  const handlePause = () => {
    pause()
  }

  const handleResume = () => {
    resume()
  }

  const handleReset = () => {
    reset()
    clearState()
    setPublicKey('')
    setHasRestoredState(false)
  }

  const handleGenerateShareLink = () => {
    if (iteration > 0) {
      const link = generateShareLink()
      navigator.clipboard.writeText(link)
      setCopiedToClipboard(true)
      setShowShareSuccess(true)
      setTimeout(() => {
        setShowShareSuccess(false)
        setCopiedToClipboard(false)
      }, 2000)
    }
  }

  const handleSpeedChange = (value: number) => {
    setSpeedLevel(SPEED_LEVELS[value])
  }

  const currentSpeedIndex = SPEED_LEVELS.indexOf(speedLevel)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Ed25519 Dream Crusher
          </h1>
          <p className="text-center text-muted-foreground mt-2 text-sm md:text-base">
            Ed25519 梦想粉碎机 —— 想破解？做梦去吧
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          {isViewMode && (
            <div className="px-6 pt-6">
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <Share2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  这是来自朋友的分享链接 - 你可以查看进度，或开始自己的破解之旅
                </span>
              </div>
            </div>
          )}
          <div className="p-6 space-y-6">
            {/* Public Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Ed25519 公钥（64 位 hex 字符）
              </label>
              <Input
                type="text"
                placeholder="0x1234...abcd"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                disabled={isRunning || isViewMode}
                readOnly={isViewMode}
                className="font-mono text-sm"
              />
              {isViewMode && (
                <p className="text-xs text-muted-foreground">
                  👁️ 查看模式：公钥来自分享链接
                </p>
              )}
              {hasRestoredState && !isRunning && !isViewMode && (
                <p className="text-xs text-muted-foreground">
                  ℹ️ 已恢复上次的运行状态
                </p>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex flex-wrap gap-3">
              {isViewMode ? (
                <Button
                  onClick={handleStartFromView}
                  disabled={!validatePublicKeyFormat(publicKey)}
                  className="flex-1 min-w-[120px]"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  我也要去破解
                </Button>
              ) : !isRunning ? (
                <Button
                  onClick={handleStart}
                  disabled={isInitializing || !validatePublicKeyFormat(publicKey)}
                  className="flex-1 min-w-[120px]"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      初始化中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      开始攻击
                    </>
                  )}
                </Button>
              ) : isPaused ? (
                <Button onClick={handleResume} className="flex-1 min-w-[120px]">
                  <Play className="w-4 h-4 mr-2" />
                  继续
                </Button>
              ) : (
                <Button onClick={handlePause} variant="secondary" className="flex-1 min-w-[120px]">
                  <Pause className="w-4 h-4 mr-2" />
                  暂停
                </Button>
              )}

              {isRunning && !isViewMode && (
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置
                </Button>
              )}
            </div>

            {/* Progress Section */}
            {(isRunning || isViewMode) && (
              <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border/30">
                {/* Iteration Count */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">当前步数</span>
                  <span className="text-lg font-mono font-bold text-primary">
                    {formattedIteration}
                  </span>
                </div>

                {/* Speed */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">当前速度</span>
                  <span className="font-mono text-sm">
                    {speed.toLocaleString()} ops/sec
                  </span>
                </div>

                {/* Remaining Time */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">预计剩余时间</span>
                  <span className="font-mono text-sm text-foreground">
                    {remainingTime}
                  </span>
                </div>

                {/* Speed Control Slider - only show when running, not in view mode */}
                {isRunning && !isViewMode && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>速度控制</span>
                      <span>{SPEED_LABELS[speedLevel]}</span>
                    </div>
                    <Slider
                      min={0}
                      max={3}
                      step={1}
                      value={currentSpeedIndex}
                      onChange={handleSpeedChange}
                      labels={SPEED_LEVELS.map(l => SPEED_LABELS[l])}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Log Panel - hide in view mode */}
            {!isViewMode && logs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">运行日志</h3>
                <ScrollArea className="h-64 rounded-md border border-border/30 bg-secondary/20 p-3">
                  <div className="space-y-2 font-mono-compact text-xs">
                    {logs.map((log) => (
                      <div key={log.id} className="text-muted-foreground leading-relaxed">
                        {log.message}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Share Button - hide in view mode */}
            {!isViewMode && isRunning && iteration > 0 && (
              <Button
                onClick={handleGenerateShareLink}
                variant="outline"
                className="w-full"
              >
                {copiedToClipboard ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制分享链接
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    生成分享链接
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>

        {/* Success Message */}
        {hasFoundKey && (
          <Card className="mt-6 border-primary/50 bg-primary/10">
            <div className="p-6 text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-primary">
                不可能的事件发生了！
              </h2>
              <p className="text-muted-foreground">
                你破解了 Ed25519！快去买彩票！🎫
              </p>
              <div className="p-3 bg-background/50 rounded-lg font-mono text-sm break-all">
                {privateKey}
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p className="mb-2">
            ⚠️ 本项目纯属娱乐和教育用途。Ed25519 在经典计算机上目前是安全的。请勿用于任何非法行为。
          </p>
          <p className="text-xs">
            Powered by Next.js 14 + shadcn/ui + @noble/curves
          </p>
        </div>
      </footer>

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              严肃警告（但请笑着读）
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {isViewMode ? (
              <>
                <p>你即将开始一个新的破解进程（使用朋友分享的公钥）</p>
                <p>理论需要约 2¹²⁶ 次操作</p>
                <p>按地球上最快电脑算，也要等 10³⁰ 年以上</p>
                <p>这纯粹是娱乐、教育、以及对数学难度的致敬</p>
                <p className="font-medium text-foreground">不会成功，但会让你感受到"绝望"的美学 😂</p>
              </>
            ) : (
              <>
                <p>你正在对真实 Ed25519 公钥发起 Pollard's Rho 攻击</p>
                <p>理论需要约 2¹²⁶ 次操作</p>
                <p>按地球上最快电脑算，也要等 10³⁰ 年以上</p>
                <p>这纯粹是娱乐、教育、以及对数学难度的致敬</p>
                <p className="font-medium text-foreground">不会成功，但会让你感受到"绝望"的美学 😂</p>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowWarning(false)}>
              先逃为敬
            </Button>
            <Button onClick={handleConfirmStart}>
              {isViewMode ? '我懂了，开始我自己的' : '我懂了，开始绝望之旅'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

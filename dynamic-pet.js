class DynamicPet {
    constructor() {
        this.element = document.getElementById('g-web-pet');
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.id = 'g-web-pet';
            document.body.appendChild(this.element);
        }

        this.bubble = document.getElementById('catSpeechBubble');
        this.bubbleText = this.bubble ? this.bubble.querySelector('.bubble-text') : null;

        // 显示在页面上的单帧尺寸。原始雪碧图是 66x66，这里按 190x190 放大显示。
        this.frameWidth = 210;
        this.frameHeight = 210;

        this.animations = {
            idle: { src: 'action/Idle.png', frames: 8 },
            walk: { src: 'action/Walk.png', frames: 8 },
            run: { src: 'action/Run.png', frames: 10 },
            runJump: { src: 'action/Run jump.png', frames: 12 },
            win: { src: 'action/Win.png', frames: 14 },
            attack1: { src: 'action/Attack1.png', frames: 15 },
            attack2: { src: 'action/Attack2.png', frames: 18 },
            death: { src: 'action/Death.png', frames: 16 },
            drag: { src: 'action/Jump.png', frames: 9 }
        };
        this.effects = {
            attack1: { src: 'action/Attack1-effect.png', frames: 2 },
            attack2: { src: 'action/Attack2-effect.png', frames: 3 }
        };
        this.oneShotStates = new Set(['win', 'attack1', 'attack2', 'death']);
        this.clickBubbleMessages = [
            '有什么事吗？',
            '今天也一起加油！',
            '你已经做得很不错啦。',
            '休息一下也没关系。',
            '别给自己太大压力。',
            '今天也会顺利的。',
            '我在旁边给你打气。',
            '累了就喝杯热茶，稍微放空一下吧。',
            '有空可以出去走走，吹吹风哦。',
            '有什么开心的事，随时可以跟我分享。',
            '多喝水，照顾好自己喔。',
            '记得按时吃饭，别饿着肚子呀。'
        ];
        this.hideBubbleMessages = [
            '我先离开一会儿，需要时再叫我！',
            '我去旁边待命啦，随时回来。',
            '我先悄悄下线一小会儿，保证随叫随到。',
            '需要我的时候，再点一下就好。',
            '我去摸会儿鱼，等你需要我的时候再闪亮登场！',
            '我去云端散个步，你想我了就叫我回来。'
        ];

        this.currentState = 'idle';
        this.currentFrame = 0;
        this.effectFrame = 0;
        this.frameTimer = null;
        this.effectTimer = null;
        this.effectElement = null;
        this.movementTimer = null;
        this.bubbleTimeout = null;
        this.oneShotCallback = null;

        this.x = 20;
        this.y = Math.max(0, window.innerHeight - this.frameHeight - 20);
        this.targetX = this.x;
        this.targetY = this.y;
        this.speed = 0;
        this.direction = 1;

        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.mouseDownTime = 0;
        this.isInteracting = false;
        this.isTalking = false;
        this.bubbleVisible = false;
        this.bubbleLocked = false;
        this.petVisible = localStorage.getItem('gWebPetVisible') !== 'false';

        this.walkSpeed = 0.5;
        this.runSpeed = 1.2;
        this.runJumpSpeed = 1.2;
        this.roamRadiusX = 320;
        this.roamRadiusY = 140;

        this.init();
    }

    init() {
        window.dynamicPet = this;
        this.removeLegacyCatBox();
        this.prepareBubble();

        this.applyCurrentState();
        this.updatePosition();
        this.element.style.display = this.petVisible ? 'block' : 'none';

        this.startAnimationLoop();
        this.bindEvents();
        this.movementLoop();
        if (this.petVisible) this.startRoaming();
        this.flushPendingBubbles();
        this.flushPendingToggle();
    }

    removeLegacyCatBox() {
        const catBox = document.getElementById('catBox');
        if (catBox) catBox.remove();
    }

    prepareBubble() {
        if (!this.bubble) return;

        this.bubble.classList.add('pet-bubble');
        const paw = this.bubble.querySelector('.bubble-paw');
        if (paw) paw.remove();
        this.updateBubblePosition();
    }

    setState(newState, force = false) {
        if (!this.animations[newState]) return;
        if (force || this.currentState !== newState) {
            this.currentState = newState;
            this.currentFrame = 0;
            this.applyCurrentState();
        }
    }

    applyCurrentState() {
        const anim = this.animations[this.currentState];
        this.element.style.backgroundImage = `url("${anim.src}")`;
        this.element.style.backgroundSize = `${anim.frames * this.frameWidth}px ${this.frameHeight}px`;
        this.updateFramePosition();
    }

    startAnimationLoop() {
        this.frameTimer = setInterval(() => {
            if (!this.petVisible && this.currentState !== 'death') return;

            const anim = this.animations[this.currentState];
            this.currentFrame++;

            if (this.currentFrame >= anim.frames) {
                if (this.oneShotStates.has(this.currentState)) {
                    this.finishOneShot();
                    return;
                }
                this.currentFrame = 0;
            }

            this.updateFramePosition();
        }, 120);
    }

    finishOneShot() {
        const callback = this.oneShotCallback;
        this.oneShotCallback = null;
        if (callback) {
            callback();
        } else {
            this.finishInteraction();
        }
    }

    updateFramePosition() {
        const bgPosX = -(this.currentFrame * this.frameWidth);
        this.element.style.backgroundPosition = `${bgPosX}px 0px`;
    }

    bindEvents() {
        this.element.addEventListener('mousedown', (e) => {
            if (!this.petVisible) return;

            this.isDragging = true;
            this.isInteracting = true;
            clearTimeout(this.movementTimer);

            this.setState('drag');

            this.dragOffsetX = e.clientX - this.x;
            this.dragOffsetY = e.clientY - this.y;
            this.mouseDownTime = Date.now();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.x = this.clamp(e.clientX - this.dragOffsetX, 0, Math.max(0, window.innerWidth - this.frameWidth));
            this.y = this.clamp(e.clientY - this.dragOffsetY, 0, Math.max(0, window.innerHeight - this.frameHeight));
            this.targetX = this.x;
            this.targetY = this.y;
            this.updatePosition();
        });

        document.addEventListener('mouseup', () => {
            if (!this.isDragging) return;
            this.isDragging = false;

            const timePressed = Date.now() - this.mouseDownTime;
            if (timePressed < 200 && !this.isTalking) {
                this.playClickAction();
                return;
            }

            this.isInteracting = false;
            this.setState('idle', true);
            if (!this.isTalking) this.startRoaming();
        });
    }

    playClickAction() {
        const clickActions = ['win', 'attack1'];
        const action = clickActions[Math.floor(Math.random() * clickActions.length)];
        this.showBubble(this.getRandomClickBubble(), true, true, '', { keepCurrentAction: true });
        this.playOneShot(action, {
            effectName: action === 'attack1' ? 'attack1' : '',
            onFinish: () => this.finishInteraction()
        });
    }

    getRandomClickBubble() {
        return this.clickBubbleMessages[Math.floor(Math.random() * this.clickBubbleMessages.length)];
    }

    toggleFromCatBox() {
        if (this.isInteracting && (this.currentState === 'win' || this.currentState === 'attack2')) return;
        if (this.petVisible) {
            this.hidePet();
        } else {
            this.showPet();
        }
    }

    showPet() {
        this.petVisible = true;
        localStorage.setItem('gWebPetVisible', 'true');
        localStorage.setItem('catVisible', 'true');

        this.element.style.display = 'block';
        this.updatePosition();
        this.hideBubble();
        this.playOneShot('attack2', {
            effectName: 'attack2',
            onFinish: () => {
                this.isInteracting = false;
                this.setState('idle', true);
                this.showBubble('我回来啦，我们继续吧~', true, true);
            }
        });
    }

    hidePet() {
        this.hideBubble();
        this.playOneShot('win', {
            onFinish: () => {
                this.stopEffect();
                this.isInteracting = false;
                this.petVisible = false;
                this.element.style.display = 'none';
                this.setState('idle', true);
                localStorage.setItem('gWebPetVisible', 'false');
                localStorage.setItem('catVisible', 'false');
            }
        });
        this.showBubble(this.getRandomHideBubble(), true, true, '', { keepCurrentAction: true });
    }

    getRandomHideBubble() {
        return this.hideBubbleMessages[Math.floor(Math.random() * this.hideBubbleMessages.length)];
    }

    playOneShot(state, { effectName = '', onFinish = null } = {}) {
        clearTimeout(this.movementTimer);
        this.speed = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isInteracting = true;
        this.stopEffect();
        this.setState(state, true);
        this.oneShotCallback = onFinish;
        if (effectName) this.playEffect(effectName);
    }

    playEffect(effectName) {
        const effect = this.effects[effectName];
        if (!effect) return;

        this.stopEffect();

        this.effectFrame = 0;
        this.effectElement = document.createElement('div');
        this.effectElement.className = 'pet-effect';
        this.effectElement.style.backgroundImage = `url("${effect.src}")`;
        this.effectElement.style.backgroundSize = `${effect.frames * this.frameWidth}px ${this.frameHeight}px`;
        this.effectElement.style.backgroundPosition = '0px 0px';
        this.element.appendChild(this.effectElement);

        this.effectTimer = setInterval(() => {
            this.effectFrame++;
            if (this.effectFrame >= effect.frames) {
                this.stopEffect();
                return;
            }
            this.effectElement.style.backgroundPosition = `${-(this.effectFrame * this.frameWidth)}px 0px`;
        }, 120);
    }

    stopEffect() {
        if (this.effectTimer) {
            clearInterval(this.effectTimer);
            this.effectTimer = null;
        }

        if (this.effectElement) {
            this.effectElement.remove();
            this.effectElement = null;
        }
    }

    finishInteraction() {
        this.stopEffect();
        this.isInteracting = false;
        if (!this.petVisible) return;
        this.setState('idle', true);
        if (!this.isTalking) this.startRoaming();
    }

    showBubble(message, lock = false, force = false, specialClass = '', options = {}) {
        if (window.isZenMode && !force) return;
        if (this.bubbleLocked && !force) return;
        if (!this.petVisible) return;
        if (!this.bubble || !this.bubbleText) return;

        const specialBubbleClasses = [
            'bubble-birthday', 'bubble-chunjie', 'bubble-yuanxiao', 'bubble-duanwu',
            'bubble-zhongqiu', 'bubble-qixi', 'bubble-shengdan', 'bubble-yuandan',
            'bubble-guoqing', 'bubble-ertong', 'bubble-qingrenjie', 'bubble-wanshengjie'
        ];

        clearTimeout(this.movementTimer);
        this.speed = 0;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isTalking = true;
        if (!options.keepCurrentAction) this.stopEffect();
        if (!this.isDragging && !options.keepCurrentAction) {
            this.isInteracting = false;
            this.setState('idle', true);
        }

        this.bubble.classList.remove(...specialBubbleClasses);
        if (specialClass && specialBubbleClasses.includes(specialClass)) {
            this.bubble.classList.add(specialClass);
        }

        this.bubbleText.textContent = this.toPetVoice(message);
        this.updateBubblePosition();
        this.bubble.classList.remove('show');
        void this.bubble.offsetWidth;
        this.bubble.classList.add('show');
        this.bubbleVisible = true;

        if (lock) this.bubbleLocked = true;
        clearTimeout(this.bubbleTimeout);
        this.bubbleTimeout = setTimeout(() => {
            this.hideBubble(specialBubbleClasses);
        }, 3000);
    }

    hideBubble(specialBubbleClasses = []) {
        clearTimeout(this.bubbleTimeout);
        this.bubbleTimeout = null;

        if (this.bubble) {
            this.bubble.classList.remove('show');
            if (specialBubbleClasses.length) {
                setTimeout(() => {
                    if (!this.bubble.classList.contains('show')) {
                        this.bubble.classList.remove(...specialBubbleClasses);
                    }
                }, 250);
            }
        }

        this.bubbleVisible = false;
        this.bubbleLocked = false;
        this.isTalking = false;

        if (this.petVisible && !this.isDragging && !this.isInteracting) {
            this.startRoaming();
        }
    }

    updateBubblePosition() {
        if (!this.bubble) return;

        const gapX = 12;
        const gapY = 18;
        const bubbleWidth = this.bubble.offsetWidth || 240;
        const bubbleHeight = this.bubble.offsetHeight || 44;
        let left = this.x + this.frameWidth - 18 + gapX;
        let top = this.y - gapY;

        let side = 'right';
        if (left + bubbleWidth > window.innerWidth - 8) {
            left = this.x - bubbleWidth + 18;
            side = 'left';
        }
        top = this.clamp(top, 8, Math.max(8, window.innerHeight - bubbleHeight - 8));

        this.bubble.style.left = `${Math.max(8, left)}px`;
        this.bubble.style.top = `${top}px`;
        this.bubble.style.bottom = 'auto';

        // Used by CSS to mirror the tail when bubble is on the left of the pet.
        this.bubble.dataset.side = side;
    }

    toPetVoice(message) {
        const directReplies = new Map([
            ['小猫先躲起来啦～', '我先退场一下，马上回来！'],
            ['小猫回来啦喵～', '我回来啦，我们继续吧~'],
            ['喵喵！！（你好！！）', '嘿，你好！今天也一起加油！'],
            ['喵~', '嘿，我在！'],
            ['喵呜~', '嘿嘿，我在这儿！'],
            ['喵喵喵？', '怎么啦？我听着呢！'],
            ['喵呜呜……有点晕了喵～', '哎呀，有点晕了，我缓一缓！']
        ]);

        const raw = String(message || '').trim();
        if (directReplies.has(raw)) return directReplies.get(raw);

        let text = raw
            .replace(/猫娘糯米/g, '小助手')
            .replace(/猫猫/g, '我')
            .replace(/小猫咪/g, '我')
            .replace(/小猫/g, '我')
            .replace(/猫咪/g, '我')
            .replace(/猫粮/g, '能量补给')
            .replace(/猫罐头/g, '能量罐头')
            .replace(/小鱼干/g, '小零食')
            .replace(/摸猫/g, '休息一下')
            .replace(/种猫草/g, '种点绿植')
            .replace(/喵呜呜/g, '哎呀')
            .replace(/喵呜/g, '嘿')
            .replace(/喵/g, '')
            .replace(/😿|😽|🐱|🐾/g, '')
            .replace(/\s+/g, ' ')
            .replace(/([～~])+$/g, '！')
            .trim();

        text = text.replace(/([，,。！？!?.])\1+/g, '$1');
        text = text.replace(/^[，,。！？!?.～~]+/, '');
        if (!text || /^[，,。！？!?.～~（）()]+$/.test(text)) {
            return '嘿，我在！今天也要精神满满！';
        }
        return text;
    }

    flushPendingBubbles() {
        const pending = window.__pendingPetBubbles;
        if (!Array.isArray(pending) || pending.length === 0) return;
        window.__pendingPetBubbles = [];
        const latest = pending[pending.length - 1];
        this.showBubble(latest.message, latest.lock, latest.force, latest.specialClass);
    }

    flushPendingToggle() {
        if (!window.__pendingPetToggle) return;
        window.__pendingPetToggle = false;
        this.toggleFromCatBox();
    }

    startRoaming() {
        if (this.isInteracting || this.isTalking || !this.petVisible) return;

        const decideNextMove = () => {
            if (this.isInteracting || this.isTalking || this.isDragging || !this.petVisible) return;

            if (Math.random() < 0.4) {
                this.setState('idle');
                this.speed = 0;
            } else {
                const maxX = Math.max(0, window.innerWidth - this.frameWidth);
                const maxY = Math.max(0, window.innerHeight - this.frameHeight);
                this.targetX = this.clamp(
                    this.x + (Math.random() * 2 - 1) * this.roamRadiusX,
                    0,
                    maxX
                );
                this.targetY = this.clamp(
                    this.y + (Math.random() * 2 - 1) * this.roamRadiusY,
                    0,
                    maxY
                );

                const moveStates = [
                    { state: 'walk', speed: this.walkSpeed },
                    { state: 'run', speed: this.runSpeed },
                    { state: 'runJump', speed: this.runJumpSpeed }
                ];
                const move = moveStates[Math.floor(Math.random() * moveStates.length)];
                this.speed = move.speed;
                this.setState(move.state);
            }

            this.movementTimer = setTimeout(decideNextMove, 3000 + Math.random() * 3000);
        };

        clearTimeout(this.movementTimer);
        decideNextMove();
    }

    movementLoop() {
        if (
            this.petVisible &&
            !this.isDragging &&
            !this.isInteracting &&
            !this.isTalking &&
            (this.currentState === 'walk' || this.currentState === 'run' || this.currentState === 'runJump')
        ) {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                this.x = this.targetX;
                this.y = this.targetY;
                this.setState('idle');
            } else {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;

                const newDirection = dx > 0 ? 1 : -1;
                if (this.direction !== newDirection) {
                    this.direction = newDirection;
                    this.element.style.transform = `scaleX(${this.direction})`;
                }
            }
            this.updatePosition();
        }

        requestAnimationFrame(() => this.movementLoop());
    }

    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        if (this.bubbleVisible) this.updateBubblePosition();
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new DynamicPet();
});

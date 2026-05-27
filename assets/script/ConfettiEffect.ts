import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Color, screen, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

interface RibbonParticle {
    node: Node;
    vx: number;
    vy: number;
    angularVel: number;
    rotation: number;
}

@ccclass('ConfettiEffect')
export class ConfettiEffect extends Component {
    @property({ type: SpriteFrame, tooltip: '彩带纹理（必需）' })
    defaultSpriteFrame: SpriteFrame = null;

    private particles: RibbonParticle[] = [];
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;
    private isPlaying: boolean = false;

    onLoad() {
        const uiTransform = this.node.getComponent(UITransform);
        if (uiTransform) {
            this.canvasWidth = uiTransform.contentSize.width;
            this.canvasHeight = uiTransform.contentSize.height;
        } else {
            const winSize = screen.windowSize;
            this.canvasWidth = winSize.width;
            this.canvasHeight = winSize.height;
        }

        if (!this.defaultSpriteFrame) {
            console.error("ConfettiEffect: 请为 defaultSpriteFrame 指定 SpriteFrame 纹理！");
            return;
        }

        this.startEffect();
    }

    startEffect() {
        if (this.isPlaying) this.clearEffect();
        this.generateParticles();
        this.isPlaying = true;
    }

    public play() {
        this.startEffect();
    }

    public stop() {
        this.clearEffect();
    }

    update(dt: number) {
        if (!this.isPlaying) return;
        if (this.particles.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.updateParticles(dt);
    }

    private hsvToRgb(h: number, s: number, v: number): Color {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        v = Math.max(0, Math.min(100, v)) / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return new Color((r + m) * 255, (g + m) * 255, (b + m) * 255, 255);
    }

    private generateParticles() {
        this.clearEffect();

        const leftCount = 60;
        const rightCount = 60;
        const baseSpeed = 950;
        const speedVary = 350;
        const angleOffset = 28;
        const minW = 6, maxW = 12;
        const minH = 28, maxH = 52;

        const parentUiTransform = this.node.getComponent(UITransform);
        const contentWidth = parentUiTransform ? parentUiTransform.contentSize.width : this.canvasWidth;
        const contentHeight = parentUiTransform ? parentUiTransform.contentSize.height : this.canvasHeight;
        
        const anchorX = parentUiTransform ? parentUiTransform.anchorX : 0.5;
        const anchorY = parentUiTransform ? parentUiTransform.anchorY : 0.5;
        
        const leftEdge = -anchorX * contentWidth;
        const rightEdge = (1 - anchorX) * contentWidth;
        const topEdge = (1 - anchorY) * contentHeight;
        const bottomEdge = -anchorY * contentHeight;

        for (let i = 0; i < leftCount; i++) {
            const x = leftEdge + 20 + Math.random() * 80;
            const y = bottomEdge + Math.random() * contentHeight;
            
            const angleDeg = 55 + (Math.random() - 0.5) * angleOffset * 2;
            const angleRad = angleDeg * Math.PI / 180;
            let speed = baseSpeed + (Math.random() - 0.5) * speedVary;
            speed = Math.max(500, speed);
            const vx = Math.cos(angleRad) * speed;
            const vy = Math.sin(angleRad) * speed;
            this.createRibbon(x, y, vx, vy, minW, maxW, minH, maxH);
        }

        for (let i = 0; i < rightCount; i++) {
            const x = rightEdge - 20 - Math.random() * 80;
            const y = bottomEdge + Math.random() * contentHeight;
            
            const angleDeg = 125 + (Math.random() - 0.5) * angleOffset * 2;
            const angleRad = angleDeg * Math.PI / 180;
            let speed = baseSpeed + (Math.random() - 0.5) * speedVary;
            speed = Math.max(500, speed);
            const vx = Math.cos(angleRad) * speed;
            const vy = Math.sin(angleRad) * speed;
            this.createRibbon(x, y, vx, vy, minW, maxW, minH, maxH);
        }
    }

    private createRibbon(x: number, y: number, vx: number, vy: number,
                         minW: number, maxW: number, minH: number, maxH: number) {
        const node = new Node();
        node.parent = this.node;
        node.setPosition(x, y, 0);

        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.defaultSpriteFrame;

        const hue = Math.random() * 360;
        const sat = 65 + Math.random() * 30;
        const light = 55 + Math.random() * 30;
        sprite.color = this.hsvToRgb(hue, sat, light);

        const uiTransform = node.getComponent(UITransform);
        const width = minW + Math.random() * (maxW - minW);
        const height = minH + Math.random() * (maxH - minH);
        uiTransform.setContentSize(width, height);

        const initRot = Math.random() * 360;
        node.setRotationFromEuler(0, 0, initRot);
        const angularVelDeg = (Math.random() - 0.5) * 400;
        const angularVelRad = angularVelDeg * Math.PI / 180;

        this.particles.push({
            node, vx, vy,
            angularVel: angularVelRad,
            rotation: initRot * Math.PI / 180
        });
    }

    private updateParticles(dt: number) {
        const safeDt = Math.min(dt, 0.033);
        const gravity = -750;
        const drag = 0.985;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (!p.node || !p.node.isValid) {
                this.particles.splice(i, 1);
                continue;
            }

            p.vx *= drag;
            p.vy *= drag;
            p.vy += gravity * safeDt;

            const newX = p.node.position.x + p.vx * safeDt;
            const newY = p.node.position.y + p.vy * safeDt;
            p.node.setPosition(newX, newY, 0);

            p.rotation += p.angularVel * safeDt;
            p.node.setRotationFromEuler(0, 0, p.rotation * 180 / Math.PI);

            const outX = newX < -300 || newX > this.canvasWidth + 300;
            const outY = newY < -300 || newY > this.canvasHeight + 400;
            if (outX || outY) {
                p.node.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    clearEffect() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.node && p.node.isValid) {
                p.node.destroy();
            }
        }
        this.particles = [];
        this.isPlaying = false;
    }

    onDestroy() {
        this.clearEffect();
    }
}

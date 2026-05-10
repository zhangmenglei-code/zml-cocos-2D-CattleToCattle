import { _decorator, Component, director, Node, ProgressBar, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingManage')
export class LoadingManage extends Component {
    // 进度条节点
    @property(ProgressBar)
    progressBarNode: ProgressBar = null;

    // 小白节点
    @property(Node)
    xiaoBaiNode: Node = null;

    barWidth: number = 300;
    barTimer: number = 0; // 定时器
    barRate: number = 2; // 速率
    

    onLoad() {
        // 初始化进度条
        this.progressBarNode.progress = 0;
    }

    start() {
        // 开始加载资源
        this.loadResource();
    }

    update(deltaTime: number) {
        
    }

    // 模拟加载
    loadResource() {
        // 显示小白节点
        this.xiaoBaiNode.active = true;
        // 开始加载资源
        this.barTimer = setInterval(() => {
            this.progressBarNode.progress += (0.01 * this.barRate);
            // 小白节点x轴跟随进度条移动
            const x = this.xiaoBaiNode.position.x + (this.barWidth / 100 * this.barRate);
            this.xiaoBaiNode.setPosition(x, 10, 0);
            // 当进度条满了，清除定时器
            if (this.progressBarNode.progress >= 1) {
                clearInterval(this.barTimer);
                // 跳转主场景
                director.loadScene('scene-home');
            }
        }, 100);
    }
}



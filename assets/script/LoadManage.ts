import { _decorator, Component, director, Node, ProgressBar, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingManage')
export class LoadingManage extends Component {
    @property(ProgressBar)
    progressBarNode: ProgressBar = null;

    @property(Node)
    xiaoBaiNode: Node = null;

    barWidth: number = 300;
    totalScenes: number = 2;
    loadedScenes: number = 0;
    
    targetProgress: number = 0;
    currentProgress: number = 0;
    minLoadTime: number = 2000;
    loadStartTime: number = 0;
    isComplete: boolean = false;
    
    xiaoBaiWidth: number = 0;

    onLoad() {
        this.progressBarNode.progress = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        
        const xiaoBaiTransform = this.xiaoBaiNode.getComponent(UITransform);
        if (xiaoBaiTransform) {
            this.xiaoBaiWidth = xiaoBaiTransform.contentSize.width;
        }
    }

    start() {
        this.xiaoBaiNode.active = true;
        this.loadStartTime = Date.now();
        this.loadScenes();
    }

    update() {
        if (this.currentProgress < this.targetProgress) {
            this.currentProgress += (this.targetProgress - this.currentProgress) * 0.1;
            if (this.currentProgress > this.targetProgress - 0.001) {
                this.currentProgress = this.targetProgress;
            }
            this.progressBarNode.progress = this.currentProgress;
            this.updateXiaoBaiPosition(this.currentProgress);
        }
        
        if (this.isComplete && this.currentProgress >= 1) {
            const elapsed = Date.now() - this.loadStartTime;
            if (elapsed >= this.minLoadTime) {
                director.loadScene('scene-home');
            }
        }
    }

    loadScenes() {
        const loadSceneWithProgress = (sceneName: string, onComplete: () => void) => {
            director.preloadScene(
                sceneName,
                (completedCount: number, totalCount: number) => {
                    const sceneProgress = completedCount / totalCount;
                    this.targetProgress = (this.loadedScenes + sceneProgress) / this.totalScenes;
                },
                () => {
                    this.loadedScenes++;
                    if (this.loadedScenes >= this.totalScenes) {
                        this.targetProgress = 1;
                        this.isComplete = true;
                    }
                    onComplete();
                }
            );
        };

        loadSceneWithProgress('scene-home', () => {
            loadSceneWithProgress('scene-level', () => {});
        });
    }

    updateXiaoBaiPosition(progress: number) {
        const barStartX = -this.barWidth / 2;
        const progressX = barStartX + progress * this.barWidth;
        const xiaoBaiX = progressX - this.xiaoBaiWidth / 2;
        this.xiaoBaiNode.setPosition(xiaoBaiX, 10, 0);
    }
}

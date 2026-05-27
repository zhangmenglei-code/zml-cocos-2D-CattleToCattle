import { _decorator, Component, director, Node } from 'cc';
const { ccclass } = _decorator;

const LEVEL_CONFIG = [
    { level: 1, xinNum: 4 },
    { level: 2, xinNum: 5 },
    { level: 3, xinNum: 6 },
    { level: 4, xinNum: 7 },
    { level: 5, xinNum: 8 },
    { level: 6, xinNum: 9 },
    { level: 7, xinNum: 10 },
    { level: 8, xinNum: 11 },
    { level: 9, xinNum: 12 }
]

@ccclass('GameManage')
export class GameManage extends Component {
    private static _instance: GameManage = null;

    private _cup: number = 0; // 奖杯
    private _energy: number = 100; // 体力
    private _level: number = 1; // 关卡
    private _survival: number = 2; // 生存次数

    public gameType: number = 1; // 游戏类型（1：普通模式，2：生存模式）
    public xinNum: number = 0; // 小新数量（根据关卡来决定，最少4，最多12）
    public maxXinNum: number = 12; // 最大小新数量
    public maxEnergy: number = 100; // 最大体力
    public levelEnergy: number = 10; // 每关体力消耗
    public levelCup: number = 10; // 每关奖杯奖励

    private energyTimer: number = null; // 体力增加器定时器

    // 数据变化的回调映射（用于 UI 更新）
    private eventTarget: Node = null;  // 作为事件派发的中介节点

    // 获取单例
    public static get instance(): GameManage {
        return GameManage._instance;
    }

    onLoad() {
        // 确保只有一个实例存在
        if (GameManage._instance) {
            this.node.destroy();
            return;
        }
        GameManage._instance = this;
        // 创建事件派发节点（独立于当前节点，避免被意外清理）
        this.eventTarget = new Node('GameManagerEventTarget');
        // 保持节点持久化
        director.addPersistRootNode(this.node);
        director.addPersistRootNode(this.eventTarget);
        // 初始化数据
        this.initData();
        // 开始体力增加器定时器
        this.addEnergyTime();
    }

    onDestroy() {
        // 清理单例引用
        if (GameManage._instance === this) {
            GameManage._instance = null;
        }
        // 清理事件派发节点
        if (this.eventTarget) {
            this.eventTarget.destroy();
        }
        // 清理体力增加器定时器
        if (this.energyTimer) {
            clearInterval(this.energyTimer);
            this.energyTimer = null;
        }
    }

    // 奖杯
    public get cup(): number {
        return this._cup;
    }
    public set cup(value: number) {
        if (this._cup === value) return;
        this._cup = Math.max(0, value);
        this.setData();
        this.emit('cupChanged', this._cup);
    }
    // 体力
    public get energy(): number {
        return this._energy;
    }
    public set energy(value: number) {
        if (this._energy === value) return;
        this._energy = Math.min(this.maxEnergy, Math.max(0, value));
        this.setData();
        this.emit('energyChanged', this._energy);
    }
    // 关卡
    public get level(): number {
        return this._level;
    }
    public set level(value: number) {
        if (this._level === value) return;
        this._level = Math.max(1, value);
        // 根据关卡更新小新数量
        this.xinNum = Math.min(this.maxXinNum, LEVEL_CONFIG[this._level - 1].xinNum ?? 12);
        this.setData();
        this.emit('levelChanged', this._level);
        this.emit('xinNumChanged', this.xinNum);
    }
    // 生存次数
    public get survival(): number {
        return this._survival;
    }
    public set survival(value: number) {
        if (this._survival === value) return;
        this._survival = Math.max(0, value);
        this.setData();
        this.emit('survivalChanged', this._survival);
    }

    // -------------- 数据公共方法 -------------
    // 增加奖杯
    public addCup(value: number = this.levelCup) {
        this.cup += value;
    }
    // 减少奖杯
    public subCup(value: number = this.levelCup) {
        if (this.cup >= value) {
            this.cup -= value;
            return true;
        }
        return false;
    }
    // 增加体力
    public addEnergy(value: number = this.levelEnergy) {
        this.energy += value;
    }
    // 减少体力
    public subEnergy(value: number = this.levelEnergy) {
        if (this.energy >= value) {
            this.energy -= value;
            return true;
        }
        return false;
    }
    // 增加关卡
    public addLevel(value: number = 1) {
        this.level += value;
    }
    // 增加生存次数
    public addSurvival(value: number = 1) {
        this.survival += value;
    }
    // 减少生存次数
    public subSurvival(value: number = 1) {
        if (this.survival >= value) {
            this.survival -= value;
            return true;
        }
        return false;
    }

    // ------------- 初始化数据 -------------
    initData() {
        const gameData = localStorage.getItem('gameData');
        if (gameData) {
            const data = JSON.parse(gameData);
            this._cup = data.cup ?? 0;
            this._energy = data.energy ?? this.maxEnergy;
            this._level = data.level ?? 1;
            this._survival = data.survival ?? 2;
        }
        this.setData();
        // 根据关卡更新小新数量
        this.xinNum = Math.min(this.maxXinNum, LEVEL_CONFIG[this._level - 1].xinNum ?? 12);
        // 发送数据变化事件
        this.emit('cupChanged', this._cup); // 奖杯
        this.emit('energyChanged', this._energy); // 体力
        this.emit('levelChanged', this._level); // 关卡
        this.emit('xinNumChanged', this.xinNum); // 小新数量
        this.emit('survivalChanged', this._survival); // 生存次数
    }

    // 存储数据
    setData() {
        const gameData = {
            cup: this._cup,
            energy: this._energy,
            level: this._level,
            survival: this._survival
        }
        localStorage.setItem('gameData', JSON.stringify(gameData));
    }

    // 定时器，每隔一分钟增加1点体力
    private addEnergyTime() {
        this.energyTimer = setInterval(() => {
            if (this._energy < this.maxEnergy) {
                this.addEnergy(1);
            }
        }, 60000);
    }

    // ---------- 事件派发（让 UI 或其他模块监听）----------
    /**
     * 监听游戏数据变化
     * @param event 事件名
     * @param callback 回调函数，参数为新的值
     */
    public on(event: string, callback: Function, target?: any) {
        this.eventTarget.on(event, callback, target);
    }

    public off(event: string, callback: Function, target?: any) {
        this.eventTarget.off(event, callback, target);
    }

    private emit(event: string, value: any) {
        this.eventTarget.emit(event, value);
    }

    // 开始游戏 type: 1 普通模式 2 生存模式
    startGame(type: number) {
        // 检查体力是否足够
        if (!this.subEnergy()) {
            return false;
        }
        if (this._survival === 0 && type === 2) {
            return false;
        }
        if (type === 2) {
            this.survival--;
            this.xinNum = 12;
        }
        this.gameType = type;
        director.loadScene('scene-level');
        return true;
    }
}



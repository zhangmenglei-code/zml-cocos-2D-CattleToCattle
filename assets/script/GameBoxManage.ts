import { _decorator, Color, Component, EventTouch, instantiate, Node, Prefab, Sprite, tween, UITransform, Vec2, Vec3, Animation } from 'cc';
const { ccclass, property } = _decorator;
import { LevelManage } from './LevelManage';

// 颜色组
const colorGroup = [
    '#AE6D45',
    '#C5668E',
    '#A5BDD7',
    '#48B4B4',
    '#E1BA45',
    '#69BCE8',
    '#9078CE',
    '#ABD893',
    '#E7A8C1',
    '#6082B7',
    '#FFA6E7',
    '#FDA872'
];

@ccclass('GameBoxManage')
export class GameBoxManage extends Component {
    // 子节点预载体
    @property(Prefab)
    private BoxItemPrefab: Prefab = null;

    // X的预载体
    @property(Prefab)
    private BoxItemXPrefab: Prefab = null;

    // 小新预载体
    @property(Prefab)
    private BoxItemXinPrefab: Prefab = null;

    // 小新的数量 = 行数 = 列数
    private BoxItemRows: number = 0;
    private BoxItemCols: number = 0;
    private xinNodes: Node[] = [];

    private buttonWidth: number = 0; // 按钮宽度
    private buttonHeight: number = 0; // 按钮高度
    private buttonSpacing: number = 6; // 按钮之间的间隙

    private doubleClickDelay: number = 200 // 双击判定时间

    private moveThresholdSq: number = 100 // 移动阈值平方（10px）

    // 按钮数据
    private buttonData: any[] = [];   // 按钮数据 - 二维数组
    private buttonNodes: any[] = [];  // 按钮节点 - 二维数组
    private buttonNodesArr: any[] = []; // 按钮节点 - 一维数组

    // 触摸状态
    private touchStartPos: Vec2 = new Vec2(); // 触摸开始位置
    private hasMovedExceed: boolean = false; // 是否超出移动阈值
    private currentHoverButton: Node | null = null; // 当前悬停的按钮节点

    // 双击/单击状态
    private pendingTimer: any = null;
    private pendingDoubleClickNode: Node | null = null;
    private pendingDoubleClickTime: number = 0;

    // 节点到行列的映射（用于快速查找）
    private nodeToPosMap: Map<Node, { row: number, col: number }> = new Map();

    // 按钮内的节点（小新、X）占比
    private scaleFactor: number = 0.8;

    onLoad() {
        // 小新的数量 = 行数 = 列数
        this.BoxItemRows = LevelManage.instance._xinNum;
        this.BoxItemCols = LevelManage.instance._xinNum;
        // 初始化按钮数据
        this.initButtonData();
        // 生成按钮节点
        this.generateButtons();
        // 注册事件
        this.registerEvents();
    }

    onDestroy() {
        this.unregisterEvents();
        this.clearPendingTimer();
    }

    // 游戏结束
    private gameOver() {
        this.xinNodes = []
        this.buttonNodesArr = []
        this.buttonData = []
        this.buttonNodes = []
        this.nodeToPosMap.clear()
        this.hasMovedExceed = false;
        this.currentHoverButton = null;
        this.pendingTimer = null;
        this.pendingDoubleClickNode = null;
        this.pendingDoubleClickTime = 0;
        this.unregisterEvents();
        this.clearPendingTimer();
    }

    // 初始化按钮数据
    private initButtonData() {
        // 1、 初始化按钮数据
        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonData[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                this.buttonData[row][col] = {
                    row: row,
                    col: col,
                    status: 0, // 0表示什么都没有，1表示单击（标记X），2表示双击（标记小新）, 3表示失败
                    isXin: false, // 是否存在小新
                    color: '' // 按钮颜色
                }
            }
        }
        // 2、小新的位置
        // 随机颜色
        const colors = colorGroup.sort(() => Math.random() - 0.5).slice(0, this.BoxItemRows);
        // 随机符合小新放置条件的坐标数组
        const resultsArr = this.getRandomNonAdjacentQueens(this.BoxItemRows);
        // 把小新插入到数据中
        for (let i = 0; i < resultsArr.length; i++) {
            const { row, col } = resultsArr[i];
            this.buttonData[row][col].isXin = true;
            this.buttonData[row][col].color = colors[i];
        }

        // 3、处理空白节点
        const [xinDatas, blankDatas] = this.getXinDatas();
        // 随机一个小新不需要进行颜色渲染
        let randomIndexArr: any[] = []
        if (this.BoxItemRows >= 6) {
            randomIndexArr = this.getRandomIndices(xinDatas.length, 2);
        } else {
            randomIndexArr = this.getRandomIndices(xinDatas.length, 1);
        }
        const xinDatasList = xinDatas.filter((item, index) => randomIndexArr.indexOf(index) === -1);
        // 这个小新需要首次渲染时，就是翻开的
        randomIndexArr.forEach(index => {
            this.buttonData[xinDatas[index].row][xinDatas[index].col].status = 2;
        })
        // 处理空白节点，当前节点的颜色就是离它最近的小新节点的颜色
        for (let i = 0; i < blankDatas.length; i++) {
            const currentNode = blankDatas[i]
            const targetNode = this.findClosestNode(currentNode, xinDatasList);
            this.buttonData[currentNode.row][currentNode.col].color = targetNode.color ?? '#000000';
        }
    }

    // 从二维数组中，找到所有的小新节点、空白节点数组
    private getXinDatas() {
        const xinDatas = [];
        const blankDatas = [];
        for (let row = 0; row < this.BoxItemRows; row++) {
            for (let col = 0; col < this.BoxItemCols; col++) {
                if (this.buttonData[row][col].isXin) {
                    xinDatas.push(this.buttonData[row][col]);
                } else {
                    blankDatas.push(this.buttonData[row][col]);
                }
            }
        }
        return [xinDatas, blankDatas];
    }

    // 从指定长度的数组中，随机n个不重复的索引
    private getRandomIndices(length: number, n: number) {
        const indices = [];
        for (let i = 0; i < length; i++) {
            indices.push(i);
        }
        const shuffled = indices.sort(() => Math.random() - 0.5); // 随机打乱索引
        return shuffled.slice(0, n);
    }

    // 生成按钮节点
    private generateButtons() {
        const container = this.node;
        const containerTransform = container.getComponent(UITransform); // 获取容器的 UITransform 组件
        const containerWidth = containerTransform.width;
        const containerHeight = containerTransform.height;

        // 计算每个按钮的宽高（留一些内边距，例如左右上下各留 20px）
        const padding = 20;
        const availableWidth = containerWidth - padding * 2;
        const availableHeight = containerHeight - padding * 2;

        this.buttonWidth = (availableWidth - (this.buttonSpacing * (this.BoxItemCols - 1))) / this.BoxItemCols;
        this.buttonHeight = (availableHeight - (this.buttonSpacing * (this.BoxItemRows - 1))) / this.BoxItemRows;

        // 起始点坐标（左下角为原点，计算时需转换到中心锚点）
        const startX = -containerWidth / 2 + padding + this.buttonWidth / 2;
        const startY = containerHeight / 2 - padding - this.buttonHeight / 2;

        // 先清空旧按钮节点
        container.removeAllChildren();
        for (let row = 0; row < this.BoxItemRows; row++) {
            this.buttonNodes[row] = [];
            for (let col = 0; col < this.BoxItemCols; col++) {
                const btnNode = instantiate(this.BoxItemPrefab);
                btnNode.parent = container;

                // 设置位置
                const x = startX + col * (this.buttonWidth + this.buttonSpacing);
                const y = startY - row * (this.buttonHeight + this.buttonSpacing);
                btnNode.setPosition(x, y, 0);

                // 设置尺寸
                const btnTransform = btnNode.getComponent(UITransform);
                if (btnTransform) {
                    btnTransform.setContentSize(this.buttonWidth, this.buttonHeight);
                }

                // 设置颜色
                const btnSprite = btnNode.getComponent(Sprite);
                if (btnSprite) {
                    btnSprite.color = new Color(this.buttonData[row][col].color);
                }

                // 如果是小新并且是双击状态，则展示小新图片
                if (this.buttonData[row][col].isXin && this.buttonData[row][col].status === 2) {
                    const xinNode = instantiate(this.BoxItemXinPrefab)
                    const xTransform = xinNode.getComponent(UITransform);
                    xinNode.parent = btnNode;
                    xTransform.setContentSize(this.buttonWidth * this.scaleFactor, this.buttonHeight * this.scaleFactor);
                    // 减少小新数量
                    LevelManage.instance.decreaseXin();
                    // 播放动画
                    const xinAni = xinNode.getComponent(Animation);
                    const clips = xinAni.clips
                    xinAni.play(clips[1].name);
                    xinAni.on(Animation.EventType.FINISHED, () => {
                        xinAni.play(clips[0].name);
                    });
                    this.xinNodes.push(xinNode)
                }

                this.buttonNodes[row][col] = btnNode;
                this.buttonNodesArr.push(btnNode);

                // 存储节点到行列的映射
                this.nodeToPosMap.set(btnNode, { row: row, col: col });
            }
        }
    }

    // 注册事件
    private registerEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    // 注销事件
    private unregisterEvents() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    // ---------------------------------------------------- 触摸事件 ----------------------------------------------------
    // 触摸开始
    private onTouchStart(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.touchStartPos.set(touchPos.x, touchPos.y);
        this.hasMovedExceed = false;

        const currentBtn = this.getButtonAtWorldPos(touchPos);
        if (!currentBtn) return;
        // 收缩按钮
        this.shrinkButton(currentBtn);
        this.handleClickOnTouchStart(currentBtn)
    }

    // 处理双击/单击判定（基于触摸开始）
    private handleClickOnTouchStart(btnNode: Node) {
        // 如果已经移动超过阈值，不再处理
        if (this.hasMovedExceed) return;
        const now = Date.now();
        const timeDiff = now - this.pendingDoubleClickTime;
        if (this.pendingDoubleClickNode === btnNode && timeDiff < this.doubleClickDelay && this.pendingDoubleClickTime !== 0) {
            // 双击生效
            this.clearPendingTimer();            // 清除之前的单击定时器
            this.onDoubleClick(btnNode);    // 触发双击回调
            this.pendingDoubleClickTime = 0;
            this.pendingDoubleClickNode = null;
        } else {
            // 第一次点击或与上次点击节点不同：开始新的单击等待
            this.clearPendingTimer();
            this.pendingDoubleClickNode = btnNode;
            this.pendingDoubleClickTime = now;
            this.pendingTimer = setTimeout(() => {
                // 等待超时，执行单击（前提是未移动超过阈值）
                if (!this.hasMovedExceed && this.pendingDoubleClickNode) {
                    this.onSingleClick(this.pendingDoubleClickNode);
                }
                this.clearPendingTimer();
            }, this.doubleClickDelay);
        }
    }

    // 触摸移动
    private onTouchMove(event: EventTouch) {
        if (LevelManage.instance.isEnd) {
            return;
        }
        const touchPos = event.getUILocation();
        // 检测移动是否超过阈值
        const dx = touchPos.x - this.touchStartPos.x;
        const dy = touchPos.y - this.touchStartPos.y;
        // 检测移动是否超过阈值
        if (!this.hasMovedExceed && (dx * dx + dy * dy) >= this.moveThresholdSq) {
            this.hasMovedExceed = true;
            this.clearPendingTimer();   // 移动超过阈值，取消任何等待的单击/双击
        }
        // 获取当前触摸点所在的按钮
        const newHover = this.getButtonAtWorldPos(touchPos);
        if (newHover === this.currentHoverButton) return;

        // 离开上一个按钮
        if (this.currentHoverButton) {
            this.expandButton(this.currentHoverButton); // 恢复按钮大小
        }
        // 进入新按钮
        if (newHover) {
            this.shrinkButton(newHover); // 缩小按钮
            this.onSingleClick(newHover);
        }
        this.currentHoverButton = newHover;
    }

    // 触摸结束
    private onTouchEnd(event: EventTouch) {
        // 恢复所有按钮的缩放（可选，确保没有遗留的缩小状态）
        this.resetAllButtonsScale();
        // 如果发生过移动，不额外触发任何点击（单击/双击已在移动时取消）
        if (this.hasMovedExceed) {
            this.resetTouchState();
            return;
        }
        // 未移动且触摸结束，什么也不做（因为单击/双击已在触摸开始时处理）
        // 但为了防止触摸开始时定时器未触发就结束（例如轻点抬起很快），定时器仍会执行。
        // 这里只需重置状态，不清除定时器，让定时器自然触发即可。
        this.resetTouchState();
    }

    // 触摸取消
    private onTouchCancel(event: EventTouch) {
        this.resetAllButtonsScale();
        this.resetTouchState();
        this.clearPendingTimer();
    }

    // 双击
    private onDoubleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            const { row, col } = pos;
            if (this.buttonData[row][col].status === 2 && this.buttonData[row][col].isXin) {
                return;
            }
            if (this.buttonData[row][col].status !== 3) {
                btnNode.removeAllChildren();
                // 判断是否是小新节点，如果是，则添加小新图片，否则当前节点为失败
                if (this.buttonData[row][col].isXin) {
                    // 如果是小新节点，则展示小新图片
                    this.buttonData[row][col].status = 2;
                    const xinNode = instantiate(this.BoxItemXinPrefab)
                    const xTransform = xinNode.getComponent(UITransform);
                    xinNode.parent = btnNode;
                    xTransform.setContentSize(this.buttonWidth * this.scaleFactor, this.buttonHeight * this.scaleFactor);
                    this.xinNodes.push(xinNode)
                    if (LevelManage.instance._xinNum > 1) {
                        // 播放动画
                        const xinAni = xinNode.getComponent(Animation);
                        const clips = xinAni.clips
                        xinAni.play(clips[1].name);
                        xinAni.on(Animation.EventType.FINISHED, () => {
                            xinAni.play(clips[0].name);
                        });
                        
                    } else {
                        // 播放所有小新动画
                        this.xinNodes.forEach(itemNode => {
                            // 播放动画
                            const xinAni = itemNode.getComponent(Animation);
                            const clips = xinAni.clips
                            xinAni.play(clips[1].name);
                            xinAni.on(Animation.EventType.FINISHED, () => {
                                xinAni.play(clips[0].name);
                            });
                        })
                        // 所有按钮恢复原始大小
                        this.resetAllButtonsScale();
                        // 游戏结束
                        this.gameOver()
                    }
                    LevelManage.instance.decreaseXin();
                } else {
                    this.buttonData[row][col].status = 3
                    const xNode = instantiate(this.BoxItemXPrefab)
                    const xTransform = xNode.getComponent(UITransform);
                    xNode.parent = btnNode;
                    xTransform.setContentSize(this.buttonWidth * this.scaleFactor, this.buttonHeight * this.scaleFactor);
                    // 设置颜色
                    const btnSprite = btnNode.getComponent(Sprite);
                    if (btnSprite) {
                        btnSprite.color = new Color('#000000');
                    }
                    const anim = xNode.getComponent(Animation)
                    anim.play();
                    // 可选：动画结束后自动恢复按钮颜色或做其他事情
                    anim.once(Animation.EventType.FINISHED, () => {
                        // 减少生命值
                        LevelManage.instance.decreaseHp();
                    });
                }
            }
            navigator.vibrate(80)
        }
    }

    // 单击
    private onSingleClick(btnNode: Node) {
        const pos = this.nodeToPosMap.get(btnNode);
        if (pos) {
            const { row, col } = pos;
            // 1、当前节点已经是双击状态且是小新，2、当前节点是双击触发的失败，都不进行处理
            if (
                (this.buttonData[row][col].status === 2 && this.buttonData[row][col].isXin) ||
                (this.buttonData[row][col].status === 3)
            ) {
                return;
            }
            // 处理按钮上的节点
            if (this.buttonData[row][col].status === 0) {
                // 如果是单击，则添加X节点，并播放动画
                this.buttonData[row][col].status = 1
                const xNode = instantiate(this.BoxItemXPrefab)
                const xTransform = xNode.getComponent(UITransform);
                xNode.parent = btnNode;
                xTransform.setContentSize(this.buttonWidth * this.scaleFactor, this.buttonHeight * this.scaleFactor);
            } else {
                // 如果已经展示了X节点，则去除X节点
                this.buttonData[row][col].status = 0
                const BoxItemXNode = btnNode.getChildByName('BoxItemXPrefab')
                if (BoxItemXNode) {
                    BoxItemXNode.removeFromParent();
                }
            }
            navigator.vibrate(80)
        }
    }

    // -------------------------------------------------------------- 辅助方法 -----------------------------------------------
    // 根据世界坐标查找按钮节点
    private getButtonAtWorldPos(worldPos: Vec2): any {
        // 遍历所有注册的按钮，检测触摸点是否在其矩形内
        for (const node of this.buttonNodesArr) {
            if (!node || !node.isValid) continue;
            const uiTransform = node.getComponent(UITransform);
            if (!uiTransform) continue;
            const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0));
            const size = uiTransform.contentSize;
            if (Math.abs(localPos.x) <= size.width / 2 && Math.abs(localPos.y) <= size.height / 2) {
                return node;
            }
        }
        return null;
    }

    // 缩小
    private shrinkButton(buttonNode: Node) {
        if (!buttonNode) return;
        tween(buttonNode).stop().to(0.05, { scale: new Vec3(0.9, 0.9, 1) }).start();
    }

    // 恢复
    private expandButton(buttonNode: Node) {
        if (!buttonNode) return;
        tween(buttonNode).stop().to(0.05, { scale: new Vec3(1, 1, 1) }).start();
    }

    // 恢复所有按钮的缩放
    private resetAllButtonsScale(): void {
        for (const node of this.buttonNodesArr) {
            this.expandButton(node);
        }
    }

    // 恢复触摸状态
    private resetTouchState(): void {
        this.hasMovedExceed = false;
        this.currentHoverButton = null;
    }

    // 清空计时器
    private clearPendingTimer(): void {
        if (this.pendingTimer) {
            clearTimeout(this.pendingTimer);
            this.pendingTimer = null;
        }
        this.pendingDoubleClickNode = null;
        this.pendingDoubleClickTime = 0;
    }

    // --------------------------- 算法逻辑 ---------------------------
    // 回溯算法 - 八皇后问题
    /**
     * 生成 N×N 宫格中所有满足以下条件的皇后坐标集合：
     * 1. 每行每列恰好一个皇后
     * 2. 任意两个皇后的八个相邻方向（包括对角线）上无其他皇后
     * @param n 棋盘大小（行数=列数=皇后数）
     * @returns 所有解的数组，每个解是一个坐标对象数组 [{row, col}, ...]
     */
    private generateNonAdjacentQueens(n: number): { row: number; col: number }[][] {
        // 已知无解的情况
        if (n === 2 || n === 3) return [];
        if (n === 1) return [[{ row: 0, col: 0 }]];

        const solutions: number[][] = [];          // 存储每行皇后所在列的索引
        const cols: boolean[] = Array(n).fill(false);
        const diag1: boolean[] = Array(2 * n - 1).fill(false); // r - c + n - 1
        const diag2: boolean[] = Array(2 * n - 1).fill(false); // r + c
        const queensCol: number[] = [];

        function backtrack(row: number): void {
            if (row === n) {
                solutions.push([...queensCol]);
                return;
            }
            for (let col = 0; col < n; col++) {
                if (cols[col]) continue;
                const d1 = row - col + n - 1;
                const d2 = row + col;
                if (diag1[d1] || diag2[d2]) continue;

                // 标准 N 皇后已经禁止了同一对角线（包括相邻对角线），无需额外判断
                cols[col] = true;
                diag1[d1] = true;
                diag2[d2] = true;
                queensCol.push(col);
                backtrack(row + 1);
                queensCol.pop();
                cols[col] = false;
                diag1[d1] = false;
                diag2[d2] = false;
            }
        }
        backtrack(0);
        // 将列索引数组转换为坐标对象数组
        return solutions.map(solution => solution.map((col, row) => ({ row, col })));
    }

    // 位运算优化版本 - 随机获取一个符合条件的
    private getRandomNonAdjacentQueens(n: number): { row: number; col: number }[] | null {
        if (n === 2 || n === 3) return null;
        if (n === 1) return [{ row: 0, col: 0 }];
        
        const solution: number[] = [];
        
        const dfs = (row: number, cols: number, diags1: number, diags2: number): boolean => {
            if (row === n) {
                return true;
            }
            
            const available = (~(cols | diags1 | diags2)) & ((1 << n) - 1);
            
            const positions: number[] = [];
            let temp = available;
            while (temp > 0) {
                positions.push(temp & -temp);
                temp &= (temp - 1);
            }
            
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }
            
            for (const pos of positions) {
                const col = this.bitIndex(pos);
                solution.push(col);
                if (dfs(
                    row + 1,
                    cols | pos,
                    (diags1 | pos) << 1,
                    (diags2 | pos) >> 1
                )) {
                    return true;
                }
                solution.pop();
            }
            return false;
        };
        
        if (dfs(0, 0, 0, 0)) {
            return solution.map((col, row) => ({ row, col }));
        }
        return null;
    }
    
    // 计算单个比特的位置（索引）
    private bitIndex(bit: number): number {
        return Math.floor(Math.log2(bit));
    }

    /**
     * 从节点列表中找出距离当前节点最近的一个节点（欧氏距离）
     * @param currentNode 当前节点，包含 row, col 坐标
     * @param otherNodeList 其他节点数组，每个包含 row, col 坐标
     * @returns 距离最近的节点对象（若列表为空则返回 null），距离相同时随机返回一个
     */
    private findClosestNode(currentNode: any, otherNodeList: any[]): any | null {
        if (otherNodeList.length === 0) return null;
        let minDistSq = Infinity;
        let closestNodes: any[] = [];

        for (const node of otherNodeList) {
            const dx = node.row - currentNode.row;
            const dy = node.col - currentNode.col;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestNodes = [node];
            } else if (distSq === minDistSq) {
                closestNodes.push(node);
            }
        }
        // 如果有多个最近节点，随机返回其中一个
        const randomIndex = Math.floor(Math.random() * closestNodes.length);
        return closestNodes[randomIndex];
    }
}



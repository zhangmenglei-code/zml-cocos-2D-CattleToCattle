import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('Toast')
export class Toast extends Component {
    private _time = 1.5 // toast提示显示时间
    private _timer = null  // toast提示定时器

    start() {
        this._timer = setTimeout(() => {
            this.node.destroy();
        }, this._time * 1000)
    }

    onDestroy() {
        clearTimeout(this._timer)
    }
}



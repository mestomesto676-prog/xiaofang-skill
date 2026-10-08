# 示例：量变与质变（15s，无声，竖屏）

- 语法：`scripts/engine/clips/xf_liangbian.js`（烧瓶隐喻：宽瓶身里水位几乎不动＝量变，进细瓶颈猛涨溢出＝质变；蓝曲线＝水位＝「感觉」）
- spec：`spec.json`（可改结尾两行 line1/line2、纵轴字 ylabel、标注 qty/qual）；`spec_qa.json` 只多了 `safe.bottom: 520`，给 qa 查字幕带
- 分镜：0–4s 近景滴水 Day1→30、小方无语 ／ 4–9s 拉远到全板、画坐标与平台期 ／ 9–13s 推近、曲线陡升、溢出、小方惊讶→开心、「质变」弹出 ／ 13–15s 拉回全图、写「没感觉，不等于没进步。」
- 渲染：`../../scripts/xf.sh render ../../scripts/engine spec.json /tmp/liangbian.mp4`

# M5UI

<!-- .. module:: m5ui -->
    :synopsis: A UI library based on LVGL v9.3

M5UI is a UI library based on LVGL v9.3. It provides a set of widgets and functions to create user interfaces for M5Stack devices.

It has been adapted for M5Stack devices and you only need to call ``m5ui.init()`` to start using it.

## M5 Series Display Libraries

#### 1. Display (M5.Lcd)

- A low-level graphics library providing basic screen drawing, text, lines, and color management.
- Can be used independently, suitable for scenarios that only require drawing graphics or text.
- **Access via**: ``M5.Lcd.fillRect()``, ``M5.Lcd.drawRect()``, ``M5.Lcd.drawString()``, etc.

#### 2. Widgets (M5.Widgets)

- A basic UI widget library providing labels, image displays, and other UI controls.
- Built on top of M5GFX.
- Suitable for simple interactive UI elements.
- **Access via**: ``M5.Widgets.Label()``, ``M5.Widgets.Image()``, ``M5.Widgets.Rectangle()``, etc.
- **Important**: ``M5.Widgets`` provides UI component **classes**, not drawing methods.

#### 3. M5UI

- A high-level UI framework based on LVGL.
- Provides page management, multi-widget layouts, and unified event handling.
- **Access via**: ``m5ui.M5Label()``, ``m5ui.M5Button()``, ``m5ui.M5Page()``, etc.

#### Usage Tips

- ⚠️ Do not mix M5GFX, M5Widgets, and M5UI simultaneously, as it may cause rendering issues or event conflicts.
- For graphics-only drawing → use M5GFX (M5.Lcd).
- For simple interactive widgets → use M5Widgets.
- For multi-page UI → use M5UI.

#### Common Mistakes to Avoid

- ❌ **WRONG**: ``Widgets.fillRect()`` or ``Widgets.drawRect()`` - These methods do not exist in Widgets module
- ✅ **CORRECT**: ``M5.Lcd.fillRect()`` or ``M5.Lcd.drawRect()`` - Use M5.Lcd for drawing methods
- ❌ **WRONG**: Mixing ``M5.Widgets.Rectangle()`` with ``m5ui.M5Page()`` - Different UI systems, don't mix
- ✅ **CORRECT**: Use either M5.Widgets OR m5ui consistently, not both together

**Key Distinction**:
- ``M5.Lcd`` = Drawing methods (fillRect, drawRect, drawCircle, drawString, etc.)
- ``M5.Widgets`` = Simple UI component classes (Label, Image, Rectangle, Circle, etc.)
- ``m5ui`` = LVGL-based UI framework (M5Label, M5Button, M5Page, M5Chart, etc.)

#### Available Fonts

The firmware includes only the following Montserrat fonts to save Flash space:

- ``lv.font_montserrat_14`` - Default font (small text)
- ``lv.font_montserrat_16`` - Medium font
- ``lv.font_montserrat_24`` - Large font

<!-- .. important:: -->

    Other font sizes (e.g., ``font_montserrat_18``, ``font_montserrat_20``,
    ``font_montserrat_22``, ``font_montserrat_28``) are **not compiled** into
    the firmware. Using them will cause ``AttributeError``.

    **Always use one of the three available sizes above.**

**Font Selection Guide**:

- Small text (labels, descriptions) → ``lv.font_montserrat_14``
- Medium text (buttons, titles) → ``lv.font_montserrat_16``
- Large text (headings, emphasis) → ``lv.font_montserrat_24``

**Example**:

<!-- .. code-block:: python -->

    import m5ui
    import lvgl as lv

    m5ui.init()
    page0 = m5ui.M5Page(bg_c=0xFFFFFF)

    # ✅ CORRECT - Use available fonts
    title = m5ui.M5Label("Title", x=10, y=10, font=lv.font_montserrat_24, parent=page0)
    label = m5ui.M5Label("Text", x=10, y=50, font=lv.font_montserrat_14, parent=page0)

    # ❌ WRONG - These fonts don't exist
    # bad_label = m5ui.M5Label("Error", font=lv.font_montserrat_28, parent=page0)  # AttributeError!

## Functions

<!-- .. function:: m5ui.init() -->

    Initialize the M5UI library. This function must be called before using any other M5UI functions.

    :return: None

<!-- .. function:: m5ui.deinit() -->

    Deinitialize the M5UI library. This function should be called when you no longer need to use M5UI.

    :return: None

## Classes

<!-- .. toctree:: -->
    :maxdepth: 1

    page.rst
    arc.rst
    bar.rst
    button.rst
    buttonmatrix.rst
    calendar.rst
    canvas.rst
    chart.rst
    checkbox.rst
    dropdown.rst
    image.rst
    keyboard.rst
    label.rst
    led.rst
    line.rst
    list.rst
    menu.rst
    msgbox.rst
    roller.rst
    scale.rst
    slider.rst
    spinbox.rst
    spinner.rst
    switch.rst
    table.rst
    tabview.rst
    textarea.rst
    win.rst
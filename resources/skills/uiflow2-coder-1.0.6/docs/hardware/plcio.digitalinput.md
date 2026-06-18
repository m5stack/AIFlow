# Digital Input

<!-- .. include:: ../refs/hardware.plcio.digitalinput.ref -->

Digital Input is used to read the digital input of host devices.

## UiFlow2 Example

#### Get the digital input status

Open the [stamplc_digital_input_example.m5f2] project in UiFlow2.

This example demonstrates how to get the status of a digital input and display the status on the screen.

UiFlow2 Code Block:

Example output:

    None

## MicroPython Example

#### Get the digital input status

This example demonstrates how to get the status of a digital input and display the status on the screen.

MicroPython Code Block:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import DigitalInput

label0 = None
digitalinput_0 = None

def digitalinput_0_falling_event(args):
    global label0, digitalinput_0
    label0.setText(str(digitalinput_0.value()))

def digitalinput_0_rising_event(args):
    global label0, digitalinput_0
    label0.setText(str(digitalinput_0.value()))

def setup():
    global label0, digitalinput_0

    M5.begin()
    label0 = Widgets.Label("label0", 112, 57, 1.0, 0xFFFFFF, 0x222222, Widgets.FONTS.DejaVu18)

    digitalinput_0 = DigitalInput(1)
    digitalinput_0.irq(digitalinput_0_falling_event, digitalinput_0.IRQ_FALLING)
    digitalinput_0.irq(digitalinput_0_rising_event, digitalinput_0.IRQ_RISING)
    label0.setText(str(digitalinput_0.value()))

def loop():
    global label0, digitalinput_0
    M5.update()

if __name__ == "__main__":
    try:
        setup()
        while True:
            loop()
    except (Exception, KeyboardInterrupt) as e:
        try:
            from utility import print_error_msg

            print_error_msg(e)
        except ImportError:
            print("please update to latest firmware")

```

Example output:

    None

## **API**

#### DigitalInput

<!-- .. class:: DigitalInput(id: int) -->

    Initialize a digital input object.

    :param int id: The ID of the digital input. The range of ID is 1-8.

    UiFlow2 Code Block:

    MicroPython Code Block:

<!-- .. code-block:: python -->

            from hadrware import DigitalInput

            in1 = DigitalInput(1)

<!-- .. method:: DigitalInput.get_status() -> bool -->

        Get the status of the digital input.

        :return: The status of the digital input.
        :rtype: bool

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                in1.get_status()

<!-- .. method:: DigitalInput.value() -> int -->

        Get the value of the digital input.

        :return: The value of the digital input.
        :rtype: int

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                in1.value()

<!-- .. method:: DigitalInput.irq(handler=None, trigger=IRQ_FALLING [ IRQ_RISING) -> None -->

        Enable interrupt for the pin.

        :param function handler: The interrupt handler function.
        :param int trigger: The interrupt trigger mode, DigitalInput.IRQ_FALLING or DigitalInput.IRQ_RISING.

        UiFlow2 Code Block:

            ]irq.png|

        MicroPython Code Block:

<!-- .. code-block:: python -->

                def handler(pin):
                    print('interrupt triggered')

                in1.irq(handler, DigitalInput.IRQ_FALLING)
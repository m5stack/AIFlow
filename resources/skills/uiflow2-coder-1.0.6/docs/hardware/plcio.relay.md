# Relay

<!-- .. include:: ../refs/hardware.plcio.relay.ref -->

Relay is used to control the relay of host devices.

## UiFlow2 Example

#### Relay control

Open the [stamplc_relay_example.m5f2] project in UiFlow2.

This example demonstrates how to use a button to control the state of a relay and display the relay's state value on the screen.

UiFlow2 Code Block:

Example output:

    None

## MicroPython Example

#### Relay control

This example demonstrates how to use a button to control the state of a relay and display the relay's state value on the screen.

MicroPython Code Block:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import Relay

label0 = None
relay_0 = None

def btnA_wasClicked_event(state):  #  noqa: N802
    global label0, relay_0
    relay_0.on()

def btnB_wasClicked_event(state):  #  noqa: N802
    global label0, relay_0
    relay_0.off()

def btnC_wasClicked_event(state):  #  noqa: N802
    global label0, relay_0
    relay_0.set_status(not (relay_0.get_status()))

def setup():
    global label0, relay_0

    M5.begin()
    label0 = Widgets.Label("label0", 75, 28, 1.0, 0xFFFFFF, 0x222222, Widgets.FONTS.DejaVu18)

    BtnA.setCallback(type=BtnA.CB_TYPE.WAS_CLICKED, cb=btnA_wasClicked_event)
    BtnB.setCallback(type=BtnB.CB_TYPE.WAS_CLICKED, cb=btnB_wasClicked_event)
    BtnC.setCallback(type=BtnC.CB_TYPE.WAS_CLICKED, cb=btnC_wasClicked_event)

    relay_0 = Relay(1)

def loop():
    global label0, relay_0
    M5.update()
    label0.setText(str(relay_0.value()))

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

#### Relay

<!-- .. class:: Relay(id: int) -->

    Initialize a relay object.

    :param int id: The ID of the relay. The range of ID is 1-4.

    UiFlow2 Code Block:

    MicroPython Code Block:

<!-- .. code-block:: python -->

            from hadrware import Relay

            relay = Relay(1)

<!-- .. method:: Relay.on() -> None -->

        Turn on the relay.

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                relay.on()

<!-- .. method:: Relay.off() -> None -->

        Turn off the relay.

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                relay.off()

<!-- .. method:: Relay.value() -> int -->

        Get the value of the relay.

        :return: The value of the relay.
        :rtype: int

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                relay.value(1)
                relay.value()

<!-- .. method:: Relay.get_status() -> bool -->

        Get the status of the relay.

        :return: The status of the relay.
        :rtype: bool

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                relay.get_status()

<!-- .. method:: Relay.set_status(status: bool) -> None -->

        Set the status of the relay.

        :param bool status: The status of the relay.

        UiFlow2 Code Block:

        MicroPython Code Block:

<!-- .. code-block:: python -->

                relay.set_status(True)
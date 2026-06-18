# PLC I/O

<!-- .. include:: ../refs/hardware.plcio.ref -->

PLC I/O is used to control the Input/Output (I/O) Capabilities of host devices.

The following are the host's support for PLC I/O functions:

<!-- .. table:: -->
    :widths: auto
    :align: center
###### 

###### [Controller       ] Digital Input  [ Relay   ]

###### [ StampPLC        ] [S]            [ ]S[     ]

<!-- .. [S] unicode:: U+2714 -->

## UiFlow2 Example

#### Digital input control relay

Open the [stamplc_plcio_example.m5f2] project in UiFlow2.

This example shows how to control a relay using a digital input.

UiFlow2 Code Block:

Example output:

    None

## MicroPython Example

#### Digital input control relay

This example shows how to control a relay using a digital input.

MicroPython Code Block:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import DigitalInput
from hardware import Relay

label0 = None
digitalinput_0 = None
digitalinput_1 = None
digitalinput_2 = None
digitalinput_3 = None
relay_0 = None
relay_1 = None
relay_2 = None
relay_3 = None

def digitalinput_0_falling_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_0.on()

def digitalinput_0_rising_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_0.off()

def digitalinput_1_falling_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_1.on()

def digitalinput_1_rising_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_1.off()

def digitalinput_2_falling_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_2.on()

def digitalinput_2_rising_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_2.off()

def digitalinput_3_falling_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_3.on()

def digitalinput_3_rising_event(args):
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
    relay_3.off()

def setup():
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3

    M5.begin()
    label0 = Widgets.Label("label0", 20, 2, 1.0, 0xFFFFFF, 0x222222, Widgets.FONTS.DejaVu18)

    digitalinput_0 = DigitalInput(1)
    digitalinput_0.irq(digitalinput_0_falling_event, digitalinput_0.IRQ_FALLING)
    digitalinput_0.irq(digitalinput_0_rising_event, digitalinput_0.IRQ_RISING)
    digitalinput_1 = DigitalInput(2)
    digitalinput_1.irq(digitalinput_1_falling_event, digitalinput_1.IRQ_FALLING)
    digitalinput_1.irq(digitalinput_1_rising_event, digitalinput_1.IRQ_RISING)
    digitalinput_2 = DigitalInput(3)
    digitalinput_2.irq(digitalinput_2_falling_event, digitalinput_2.IRQ_FALLING)
    digitalinput_2.irq(digitalinput_2_rising_event, digitalinput_2.IRQ_RISING)
    digitalinput_3 = DigitalInput(4)
    digitalinput_3.irq(digitalinput_3_falling_event, digitalinput_3.IRQ_FALLING)
    digitalinput_3.irq(digitalinput_3_rising_event, digitalinput_3.IRQ_RISING)
    relay_0 = Relay(1)
    relay_1 = Relay(2)
    relay_2 = Relay(3)
    relay_3 = Relay(4)

def loop():
    global \
        label0, \
        digitalinput_0, \
        digitalinput_1, \
        digitalinput_2, \
        digitalinput_3, \
        relay_0, \
        relay_1, \
        relay_2, \
        relay_3
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

## API

<!-- .. toctree:: -->
    :maxdepth: 1

    plcio.digitalinput.rst
    plcio.relay.rst
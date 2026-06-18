# Atom DTU LoRaWAN-Series(RAK3172) Base

<!-- .. sku:U184-CN470,U184-AS923,U184-EU868,U184-US915 -->

<!-- .. include:: ../refs/base.lorawan_rui3.ref -->

SKU: A152-CN470, A152-US915, A152-EU868

The Atom DTU LoRaWAN-Series is a LoRaWAN programmable data transfer unit (DTU) based on the STM32WLE5 chip. The module supports long-range communication, low-power operation, and high sensitivity characteristics, making it suitable for IoT communication needs in a variety of complex environments.

- **Frequency band support**: CN470 (470MHz), EU868 (868MHz), US915 (915MHz)
- **Communication protocol**:
  
  - Supports LoRaWAN Class A, Class B, Class C modes
  - Supports LoRa Point-to-Point (P2P) communication mode.

- **Communication Interface**:
  
  - UART interface: Used to send AT commands to control LoRaWAN network access, data sending/receiving, P2P mode communication, etc.
  - RS485 interface: supports wired communication of industrial equipment with high reliability.

- **Internet access method**:
  
  - OTAA (Over-The-Air Activation)
  - ABP (Activation By Personalization)

Support the following products:

================== ================== ==================
        
================== ================== ==================

Micropython LoRaWAN-EU868 LoRaWAN OTAA Mode Example:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import RGB
from base import AtomDTULoRaWANRUI3Base

rgb = None
base_lorawaneu868 = None

def setup():
    global rgb, base_lorawaneu868

    M5.begin()
    rgb = RGB()
    base_lorawaneu868 = AtomDTULoRaWANRUI3Base(2, port=(19, 22))
    base_lorawaneu868.set_network_mode(1)
    base_lorawaneu868.set_otaa_config(
        "70B3D57ED007006A", "A843ECB026197C981D67AEFACC72D01E", "70B3D57ED0063472"
    )
    base_lorawaneu868.set_rx_delay_on_window1(1)
    base_lorawaneu868.set_rx_delay_on_window2(2)
    base_lorawaneu868.set_rx_data_rate_on_windows2(0)
    base_lorawaneu868.set_lorawan_node_class("C")
    if base_lorawaneu868.join_network(10000):
        print("Success join the network")
        rgb.fill_color(0x33FF33)
        base_lorawaneu868.send_data(1, "AABBCC", 0)
    else:
        print("Failed Join to the network")
        rgb.fill_color(0xFF0000)

def loop():
    global rgb, base_lorawaneu868
    M5.update()
    if BtnA.wasPressed():
        if (base_lorawaneu868.get_received_data_count()) != 0:
            print(base_lorawaneu868.get_received_data_string())
        else:
            print("Message queue is empty")

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

Micropython LoRaWAN-EU868 P2P Mode TX Example:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import RGB
from base import AtomDTULoRaWANRUI3Base

rgb = None
base_lorawaneu868 = None

def setup():
    global rgb, base_lorawaneu868

    M5.begin()
    rgb = RGB()
    base_lorawaneu868 = AtomDTULoRaWANRUI3Base(2, port=(19, 22))
    base_lorawaneu868.set_network_mode(0)
    base_lorawaneu868.set_p2p_frequency(600000000)
    base_lorawaneu868.set_p2p_spreading_factor(7)
    base_lorawaneu868.set_p2p_bandwidth(0)
    base_lorawaneu868.set_p2p_tx_power(14)
    base_lorawaneu868.set_p2p_code_rate(0)
    base_lorawaneu868.set_p2p_preamble_length(8)
    print("Press the button to send P2P message")

def loop():
    global rgb, base_lorawaneu868
    M5.update()
    if BtnA.wasPressed():
        base_lorawaneu868.send_p2p_data("AABBCC", timeout=0, to_hex=False)

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

Micropython LoRaWAN-EU868 P2P Mode RX Example:

```python
# SPDX-FileCopyrightText: 2025 M5Stack Technology CO LTD
#
# SPDX-License-Identifier: MIT

import os, sys, io
import M5
from M5 import *
from hardware import RGB
from base import AtomDTULoRaWANRUI3Base

rgb = None
base_lorawaneu868 = None

def setup():
    global rgb, base_lorawaneu868

    M5.begin()
    rgb = RGB()
    base_lorawaneu868 = AtomDTULoRaWANRUI3Base(2, port=(19, 22))
    base_lorawaneu868.set_network_mode(0)
    base_lorawaneu868.set_p2p_frequency(600000000)
    base_lorawaneu868.set_p2p_spreading_factor(7)
    base_lorawaneu868.set_p2p_bandwidth(0)
    base_lorawaneu868.set_p2p_tx_power(14)
    base_lorawaneu868.set_p2p_code_rate(0)
    base_lorawaneu868.set_p2p_preamble_length(8)
    print("Press the button to send P2P message")

def loop():
    global rgb, base_lorawaneu868
    M5.update()
    if BtnA.wasPressed():
        base_lorawaneu868.send_p2p_data("AABBCC", timeout=0, to_hex=False)

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

UIFLOW2 LoRaWAN-EU868 LoRaWAN OTAA Mode Example:

    [base_lorawan868_otaa_atom_lite_example.m5f2]

UIFLOW2 LoRaWAN-EU868 P2P Mode TX Example:

    [base_lorawan868_p2p_tx_atom_lite_example.m5f2]

UIFLOW2 LoRaWAN-EU868 P2P Mode RX Example:

    [base_lorawan868_p2p_rx_atom_lite_example.m5f2]

## **API**

#### AtomDTULoRaWANRUI3Base

## AtomDTULoRaWANRUI3Base
Create an AtomDTULoRaWANRUI3Base object.

:param int id: The UART ID to use (0, 1, or 2). Default is 2.
:param port: A list or tuple containing the TX and RX pin numbers.
:type port: list [ tuple
:param bool debug: Whether to enable debug mode. Default is False.

MicroPython Code Block:

    .. code-block:: python

        from base import AtomDTULoRaWANRUI3Base

        lorawan_rui3 = AtomDTULoRaWANRUI3Base(2, port=(19, 22))

### `set_abp_config`
Configure the device for ABP (Activation By Personalization) mode.

:param str dev_addr: The device address for ABP configuration.
:param str apps_key: The application session key for encryption.
:param str nwks_key: The network session key for communication.

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.set_abp_config(
            dev_addr="26011D89",
            apps_key="2B7E151628AED2A6ABF7158809CF4F3C",
            nwks_key="2B7E151628AED2A6ABF7158809CF4F3C"
        )

### `get_abp_config`
Retrieve the current ABP configuration.

:returns: A tuple containing (device_address, apps_key, networks_key).
:rtype: tuple[str, str, str]

MicroPython Code Block:

    .. code-block:: python

        print(lorawan_rui3.get_abp_config())

### `set_otaa_config`
Configure the device for OTAA (Over-The-Air Activation) mode.

:param str device_eui: The device EUI for OTAA configuration.
:param str app_key: The application key for encryption.
:param str app_eui: The application EUI for OTAA configuration.

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.set_otaa_config(
            device_eui="2CF7F1C0420000AA",
            app_key="2B7E151628AED2A6ABF7158809CF4F3C"
            app_eui="80000000000000AA",
        )

### `get_otaa_config`
Retrieve the current OTAA configuration.

:returns: A tuple containing (device_eui, app_key, app_eui).
:rtype: tuple[str, str, str]

MicroPython Code Block:

    .. code-block:: python

        print(lorawan_rui3.get_otaa_config())

## RUI3
### `close`

### `get_received_data`
Retrieve the data from the last received message.

:returns: A tuple containing the port number (int) and the received data (bytes), or False if no data was received.
:rtype: tuple[int, bytes] ] bool

MicroPython Code Block:

    .. code-block:: python

        data = lorawan_rui3.get_received_data()
        if data:
            print(f"Received data: {data}")
        else:
            print("No data received.")

### `get_received_data_string`
Retrieve the received data as a string.

:returns: The received data as a string, or an empty string if no data was received.
:rtype: str

MicroPython Code Block:

    .. code-block:: python

        data = lorawan_rui3.get_received_data_string()
        if data:
            print(f"Received data: {data}")
        else:
            print("No data received.")

### `get_received_data_count`
Retrieve the number of received data.

:returns: The number of received data.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        count = lorawan_rui3.get_received_data_count()
        print(f"Received data count: {count}")

### `send_cmd`

### `read_response`

### `get_commuinication_state`

### `reset_module`

### `reset_module_to_default`
Reset the module to its factory default settings.

MicroPython Code Block:

    .. code-block:: python

        rui3.reset_module_to_default()

### `get_serial_number`

### `get_fireware_version`

### `get_at_version`

### `get_hardware_version`

### `get_hardware_id`

### `get_ble_mac`

### `set_sleep_time`

### `get_low_power_mode`

### `set_low_power_mode`

### `set_baud_rate`

### `get_baud_rate`

### `get_device_eui`
Get the device EUI.

:returns: The device EUI.
:rtype: str

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.get_device_eui()

### `set_device_eui`

### `get_app_eui`

### `set_app_eui`

### `get_app_key`

### `set_app_key`

### `get_device_address`

### `set_device_address`

### `get_apps_key`

### `set_apps_key`

### `get_networks_key`

### `set_networks_key`

### `set_network_id`

### `get_network_id`

### `get_mc_root_key`

### `get_confirm_mode`

### `set_confirm_mode`

### `get_confirm_state`

### `get_join_config`

### `set_join_config`
Configure the join parameters for LoRaWAN.

The configuration does not confirm network join success.

:param int state: The join state to configure, as an integer.
:param int auto_join: The auto-join flag, as an integer.
:param int reattempt_interval: The interval between join retries, in seconds. Default is 8.
:param int max_attempts: The maximum number of retries. Default is 0 (no limit).
:param int timeout: The timeout duration in milliseconds for the command. Default is 8000ms.

:returns: True if the command is successfully set, else False.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.set_join_config(
            state=1,
            auto_join=1,
            reattempt_interval=10,
            max_attempts=5,
            timeout=10000
        )

### `join_network`
Join the LoRa network using predefined join parameters.

:param int timeout: The timeout duration in milliseconds for the join command. Default is 8000ms.

:returns: True if the command is successfully set, else False.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        if lorawan_rui3.join_network(timeout=10000):
            print("Network joined successfully!")
        else:
            print("Failed to join network.")

### `get_join_mode`

### `set_join_mode`
Set the join mode for the LoRa module.

:param int mode: The join mode to set, 0 for ABP or 1 for OTAA.

:returns: True if the command is successfully set, else False.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.set_join_mode(1)  # Set to OTAA mode

### `get_join_state`
Check whether the module has successfully joined the network.

:returns: True if joined, otherwise False.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        if lorawan_rui3.get_join_state():
            print("Module is joined to the network.")
        else:
            print("Module is not joined to the network.")

### `get_last_receive`
Retrieve the data from the last received message.

:returns: A tuple containing the port number (int) and the received data (bytes), or False if no data was received.
:rtype: tuple[int, bytes] [ bool

MicroPython Code Block:

    .. code-block:: python

        last_data = lorawan_rui3.get_last_receive()
        if last_data:
            port, data = last_data
            print(f"Received data on port {port}: {data}")
        else:
            print("No data received.")

### `send_data`
Send data through a specific port.

:param int port: The port number to send data through.
:param data: The data to send, provided as bytes or string(if data is bytes, it will be converted to string).
:type data: bytes ] str
:param int timeout: The timeout duration in milliseconds for the send command. Default is 600ms.

:returns: True if the data was sent successfully, otherwise False.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.send_data(port=1, data=b"HelloLoRa", timeout=800)
        if success:
            print("Data sent successfully!")
        else:
            print("Failed to send data.")

### `send_long_data`

### `set_retry`

### `get_retry`

### `get_adaptive_rate_state`

### `set_adaptive_rate_state`

### `get_lorawan_node_class`

### `set_lorawan_node_class`

### `get_duty_cycle_state`

### `set_duty_cycle_state`

### `get_data_rate`

### `set_data_rate`

### `get_join_delay_on_window1`

### `set_join_delay_on_window1`

### `get_join_delay_on_window2`

### `set_join_delay_on_window2`

### `get_public_network_mode`

### `set_public_network_mode`

### `get_rx_delay_on_window1`

### `set_rx_delay_on_window1`

### `get_rx_delay_on_window2`

### `set_rx_delay_on_window2`

### `get_rx_data_rate_on_windows2`

### `set_rx_data_rate_on_windows2`

### `get_rx_frequency_on_windows2`

### `get_tx_power`

### `set_tx_power`

### `get_network_link_state`

### `set_network_link_state`

### `get_listen_before_talk`

### `set_listen_before_talk`

### `set_listen_before_talk_rssi`

### `get_listen_before_talk_rssi`

### `get_listen_before_talk_scan_time`

### `set_listen_before_talk_scan_time`

### `get_time_request`

### `set_time_request`

### `get_location_time`

### `get_unicast_ping_interval`

### `set_unicast_ping_interval`

### `get_beacon_frequency`

### `get_beacon_time`

### `get_beacon_gateway_gps`

### `get_rssi`

### `get_all_rssi`

### `get_signal_noise_ratio`

### `get_channel_mask`

### `set_channel_mask`

### `get_eight_channel_mode_state`

### `set_eight_channel_mode_state`

### `get_single_channel_mode`

### `set_single_channel_mode`

### `get_active_region`

### `set_active_region`

### `add_multicast_group`

### `remove_multicast_group`

### `get_multicast_list`

### `get_network_mode`

### `set_network_mode`
Set the network mode for the device.

:returns: The result of the AT command execution.
:rtype: bool

:param int mode: The mode to set for the network:

    - 0 = P2P_LORA
    - 1 = LoRaWAN
    - 2 = P2P_FSK

MicroPython Code Block:

    .. code-block:: python

        lorawan_rui3.set_network_mode(0)  # Set to P2P_LORA mode

### `get_p2p_frequency`
Retrieve the current P2P frequency.

:returns: The current P2P frequency as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        frequency = lorawan_rui3.get_p2p_frequency()
        print(f"Current P2P frequency: {frequency} Hz")

### `set_p2p_frequency`
Set the P2P frequency for the device.

:returns: The result of the AT command execution.
:rtype: bool

:param int frequency: The frequency to set for P2P communication.

    - Low-frequency range: 150000000-600000000
    - High-frequency range: 600000000-960000000

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_frequency(433000000)
        if success:
            print("P2P frequency set successfully!")
        else:
            print("Failed to set P2P frequency.")

### `get_p2p_spreading_factor`
Retrieve the current P2P spreading factor.

:returns: The current P2P spreading factor as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        sf = lorawan_rui3.get_p2p_spreading_factor()
        print(f"Current P2P spreading factor: {sf}")

### `set_p2p_spreading_factor`
Set the P2P spreading factor.

:param int spreading_factor: The spreading factor to set for P2P communication.

    - Range is 5 to 12.

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_spreading_factor(10)
        if success:
            print("P2P spreading factor set successfully!")
        else:
            print("Failed to set P2P spreading factor.")

### `get_p2p_bandwidth`
Retrieve the current P2P bandwidth.

:returns: The current P2P bandwidth as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        bw = lorawan_rui3.get_p2p_bandwidth()
        print(f"Current P2P bandwidth: {bw}")

### `set_p2p_bandwidth`
Set the P2P bandwidth.

:param int bandwidth: The bandwidth to set for P2P communication.

    - For LoRa:
        - 0 = 125 kHz
        - 1 = 250 kHz
        - 2 = 500 kHz
        - 3 = 7.8 kHz
        - 4 = 10.4 kHz
        - 5 = 15.63 kHz
        - 6 = 20.83 kHz
        - 7 = 31.25 kHz
        - 8 = 41.67 kHz
        - 9 = 62.5 kHz

    - For FSK:
        Range: 4800-467000 Hz

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_bandwidth(1)  # Set to 250 kHz
        if success:
            print("P2P bandwidth set successfully!")
        else:
            print("Failed to set P2P bandwidth.")

### `get_p2p_code_rate`
Retrieve the current P2P code rate.

:returns: The current P2P code rate as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        code_rate = lorawan_rui3.get_p2p_code_rate()
        print(f"Current P2P code rate: {code_rate}")

### `set_p2p_code_rate`
Set the P2P code rate.

:param int code_rate: The code rate to set for P2P communication.

        - 0 = 4/5
        - 1 = 4/6
        - 2 = 4/7
        - 3 = 4/8

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_code_rate(1)  # Set to 4/6
        if success:
            print("P2P code rate set successfully!")
        else:
            print("Failed to set P2P code rate.")

### `get_p2p_preamble_length`
Retrieve the current P2P preamble length.

:returns: The current P2P preamble length as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        preamble_length = lorawan_rui3.get_p2p_preamble_length()
        print(f"Current P2P preamble length: {preamble_length}")

### `set_p2p_preamble_length`
Set the P2P preamble length.

:returns: The result of the AT command execution.
:rtype: bool

:param int length: The preamble length to set for P2P communication.

    - Range is 5 to 65535.

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_preamble_length(16)
        if success:
            print("P2P preamble length set successfully!")
        else:
            print("Failed to set P2P preamble length.")

### `get_p2p_tx_power`
Retrieve the current P2P transmission power.

:returns: The current P2P transmission power as an integer.
:rtype: int

MicroPython Code Block:

    .. code-block:: python

        tx_power = lorawan_rui3.get_p2p_tx_power()
        print(f"Current P2P transmission power: {tx_power} dBm")

### `set_p2p_tx_power`
Set the P2P transmission power.

:param int power: The transmission power to set for P2P communication.

    - Range is 5 to 22 dBm.

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_tx_power(20)  # Set to 20 dBm
        if success:
            print("P2P transmission power set successfully!")
        else:
            print("Failed to set P2P transmission power.")

### `get_p2p_fsk_bitrate`
Retrieve the current P2P FSK bitrate.

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        fsk_bitrate = lorawan_rui3.get_p2p_fsk_bitrate()
        print(f"Current P2P FSK bitrate: {fsk_bitrate} b/s")

### `set_p2p_fsk_bitrate`
Set the P2P FSK bitrate.

:param int bitrate: The bitrate to set for P2P FSK communication.

    - Range is 600 to 300000 b/s.

:returns: The result of the AT command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_fsk_bitrate(9600)  # Set to 9600 b/s
        if success:
            print("P2P FSK bitrate set successfully!")
        else:
            print("Failed to set P2P FSK bitrate.")

### `get_p2p_fsk_frequency_deviation`

### `set_p2p_fsk_frequency_deviation`

### `send_p2p_data`
Send P2P data with a given payload.

:param str payload: The payload to send.

    - Length must be between 2 and 500 characters.
    - Must consist of an even number of characters composed of 0-9, a-f, A-F, representing 1 to 256 hexadecimal values.
:param int timeout: The timeout for the data transmission, in milliseconds. Default is 1000 ms.
:param bool to_hex: Indicates whether to convert the payload to hexadecimal format. Default is False.

:returns: True if the data was sent successfully ("TXFSK DONE" or "TXP2P DONE"), False otherwise.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.send_p2p_data("abcdef", timeout=2000, to_hex=True)
        if success:
            print("P2P data sent successfully!")
        else:
            print("Failed to send P2P data.")

### `get_p2p_channel_activity`

### `set_p2p_channel_activity`

### `get_p2p_receive_data`
Receive data in P2P mode, including RSSI, SNR, and payload.

:param int timeout: Timeout for listening to P2P LoRa data packets, in milliseconds.

        - Valid values are 1 to 65535.
            - 0: Continuous listening.
            - 65535: No timeout.

:param bool to_str: Indicates whether to convert the payload to a string. Default is False.
:returns: A tuple (RSSI, SNR, Payload) if data is received; False if no data is received.
:rtype: tuple[int, int, str] | bool

MicroPython Code Block:

    .. code-block:: python

        result = lorawan_rui3.get_p2p_receive_data(timeout=1000, to_str=True)
        if result:
            rssi, snr, payload = result
            print(f"Received data - RSSI: {rssi}, SNR: {snr}, Payload: {payload}")
        else:
            print("No data received.")

### `get_p2p_encryption_state`

### `set_p2p_encryption_state`

### `get_p2p_encryption_key`

### `set_p2p_encryption_key`

### `get_p2p_crypt_state`

### `set_p2p_crypt_state`

### `get_p2p_crypt_key`

### `set_p2p_crypt_key`

### `get_p2p_encryption_iv`

### `set_p2p_encryption_iv`

### `get_p2p_parameters`

### `set_p2p_parameters`

### `get_p2p_iq_inversion`

### `set_p2p_iq_inversion`

### `get_p2p_sync_word`
Get the current sync word in P2P mode.

:returns: The sync word as a string.
:rtype: str

MicroPython Code Block:

    .. code-block:: python

        sync_word = lorawan_rui3.get_p2p_sync_word()
        print(f"Current P2P sync word: {sync_word}")

### `set_p2p_sync_word`
Set the sync word in P2P mode.

:param int sync_word: The sync word value.

    - Must be in the range of 0x0000 to 0xFFFF.

:returns: The response from the command execution.
:rtype: bool

MicroPython Code Block:

    .. code-block:: python

        success = lorawan_rui3.set_p2p_sync_word(0x1234)
        if success:
            print("P2P sync word set successfully!")
        else:
            print("Failed to set P2P sync word.")

### `get_p2p_symbol_timeout`

### `set_p2p_symbol_timeout`

### `get_p2p_fix_length_payload_state`

### `set_p2p_fix_length_payload_state`

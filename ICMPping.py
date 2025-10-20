import socket
import struct
import time
import statistics

def calculate_checksum(data):
    """Calculate the checksum for ICMP packet"""
    # If odd number of bytes, pad with zero
    if len(data) % 2 != 0:
        data += b'\0'
    
    # Sum up 16-bit words
    total = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        total += word
    
    # Add carry bits and take one's complement
    total = (total >> 16) + (total & 0xffff)
    total += total >> 16
    checksum = ~total & 0xffff
    
    return checksum

def create_icmp_packet(packet_id, sequence):
    """Create an ICMP echo request packet"""
    # ICMP header: type (8), code (0), checksum (0 for now), id, sequence
    icmp_type = 8  # Echo request
    icmp_code = 0
    checksum = 0
    
    # Pack the header (checksum is 0 initially)
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, sequence)
    
    # Add some data payload
    data = b'Python ICMP Ping' * 4  # 64 bytes of data
    
    # Calculate checksum with header and data
    checksum = calculate_checksum(header + data)
    
    # Repack header with correct checksum
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, sequence)
    
    return header + data

def ping(host, count=4, timeout=1):
    """
    Send ICMP echo requests to a host and measure response times
    
    Args:
        host: Target hostname or IP address
        count: Number of ping packets to send
        timeout: Socket timeout in seconds
    """
    try:
        # Resolve hostname to IP
        dest_addr = socket.gethostbyname(host)
        print(f"Pinging {host} [{dest_addr}] with 64 bytes of data:\n")
    except socket.gaierror:
        print(f"Could not resolve hostname: {host}")
        return
    
    # Create raw socket
    try:
        icmp_socket = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
        icmp_socket.settimeout(timeout)
    except PermissionError:
        print("Error: This program requires root/administrator privileges to create raw sockets.")
        print("Run with: sudo python3 ICMPping.py (Linux/Mac) or run as Administrator (Windows)")
        return
    
    packet_id = 12345  # Arbitrary ID for this ping session
    rtts = []  # Store round-trip times
    packets_sent = 0
    packets_received = 0
    
    for sequence in range(1, count + 1):
        # Create ICMP packet
        packet = create_icmp_packet(packet_id, sequence)
        
        # Send packet and record time
        send_time = time.time()
        icmp_socket.sendto(packet, (dest_addr, 1))
        packets_sent += 1
        
        try:
            # Wait for reply
            data, addr = icmp_socket.recvfrom(1024)
            recv_time = time.time()
            
            # Calculate RTT in milliseconds
            rtt = (recv_time - send_time) * 1000
            rtts.append(rtt)
            packets_received += 1
            
            # Parse ICMP header from reply (skip IP header - first 20 bytes)
            icmp_header = data[20:28]
            reply_type, reply_code, checksum, reply_id, reply_seq = struct.unpack('!BBHHH', icmp_header)
            
            print(f"Reply from {addr[0]}: bytes={len(data)-20} time={rtt:.2f}ms TTL=64 seq={reply_seq}")
            
        except socket.timeout:
            print(f"Request timed out (sequence {sequence})")
        
        # Wait 1 second between pings (except for last one)
        if sequence < count:
            time.sleep(1)
    
    # Close socket
    icmp_socket.close()
    
    # Print statistics
    print(f"\n--- {host} ping statistics ---")
    print(f"{packets_sent} packets transmitted, {packets_received} received, {100 * (packets_sent - packets_received) / packets_sent:.1f}% packet loss")
    
    if rtts:
        print(f"rtt min/avg/max/stddev = {min(rtts):.3f}/{statistics.mean(rtts):.3f}/{max(rtts):.3f}/{statistics.stdev(rtts) if len(rtts) > 1 else 0:.3f} ms")

if __name__ == "__main__":
    import sys
    
    # Get target from command line or use default
    target = sys.argv[1] if len(sys.argv) > 1 else "google.com"
    
    ping(target, count=4, timeout=2)
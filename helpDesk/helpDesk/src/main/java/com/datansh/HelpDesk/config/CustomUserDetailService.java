package com.datansh.HelpDesk.config;

import com.datansh.HelpDesk.entity.RolePermissionJunction;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.repository.RolePermissionJunctionRepository;
import com.datansh.HelpDesk.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailService implements UserDetailsService {
    private final   UserRepository userRepository;
    private  final RolePermissionJunctionRepository rolePermissionJunctionRepository;
    public CustomUserDetailService (UserRepository userRepository ,RolePermissionJunctionRepository rolePermissionJunctionRepository){
        this.userRepository = userRepository;
        this.rolePermissionJunctionRepository = rolePermissionJunctionRepository;
    }
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username).orElseThrow(
                ()->new UsernameNotFoundException("User not found with the email that is provided"));
        Long roleId = user.getRole().getRoleId();
        List<RolePermissionJunction>  permissions = rolePermissionJunctionRepository.findPermissionsByRoleId(roleId);
        List<SimpleGrantedAuthority> authorities = permissions.stream()
                .map(permission->new SimpleGrantedAuthority(permission.getPermission().getName())).toList();

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }
}

package com.datansh.HelpDesk.service;

import com.datansh.HelpDesk.dto.CreateUserRequest;
import com.datansh.HelpDesk.dto.CreateUserResponse;
import com.datansh.HelpDesk.entity.User;
import com.datansh.HelpDesk.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    public UserService(UserRepository userRepository ,PasswordEncoder passwordEncoder){
        this.userRepository = userRepository;
        this.passwordEncoder =passwordEncoder;
    }

    public CreateUserResponse createUser(CreateUserRequest request){
        String hashPassword = passwordEncoder.encode(request.password())  ;
        User userReq = User.builder().email(request.email())
                .name(request.name())
                .password(hashPassword)
                .isActive(true)
                .build();
        User savedUser = userRepository.save(userReq);
        
        return new CreateUserResponse(savedUser.getUserPublicId(),
                savedUser.getName(),
                savedUser.getEmail(),
                savedUser.getIsActive());
    }
    public Page<CreateUserResponse> getAllUsers(Pageable pageable){
        return userRepository.findAll(pageable).map(this::mapToResponse);
    }
    public void deleteUser(UUID userPublicId){
        User user = userRepository.findByUserPublicId(userPublicId) ;

        userRepository.delete(user);

    }
    public CreateUserResponse updateUser(UUID userPublicId,CreateUserRequest request){
        String hashPassword = passwordEncoder.encode(request.password());
       User user = userRepository.findByUserPublicId(userPublicId);
       user.setName(request.name());
       user.setEmail(request.email());
       user.setPassword(hashPassword);
       User savedUser = userRepository.save(user);
       return  new CreateUserResponse(savedUser.getUserPublicId(),
               savedUser.getName(), savedUser.getEmail(),
               savedUser.getIsActive());

    }

    private CreateUserResponse mapToResponse(User user) {
        return  new CreateUserResponse(user.getUserPublicId(),
                user.getName(),
                user.getEmail(),
                user.getIsActive()) ;
    }
    
}

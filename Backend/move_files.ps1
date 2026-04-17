 = "c:\Users\DELL\OneDrive\Desktop\project\PAF\Smart Campus Operation\Backend\src\main\java\com\smartcampus"
 = "\modulec"
 = "\operationshub"

New-Item -ItemType Directory -Force "\auth\domain"
New-Item -ItemType Directory -Force "\auth\repository"
New-Item -ItemType Directory -Force "\auth\security"
New-Item -ItemType Directory -Force "\facilities\controller"
New-Item -ItemType Directory -Force "\facilities\domain"
New-Item -ItemType Directory -Force "\facilities\dto"
New-Item -ItemType Directory -Force "\facilities\repository"
New-Item -ItemType Directory -Force "\facilities\service"
New-Item -ItemType Directory -Force "\common"
New-Item -ItemType Directory -Force "\config"

Move-Item "\controller\ApiExceptionHandler.java" "\common"
Move-Item "\controller\ApiValidationException.java" "\common"

Move-Item "\controller\AuthAdminController.java" "\auth\controller"
Move-Item "\controller\AuthController.java" "\auth\controller"

Move-Item "\service\AuthAdminService.java" "\auth\service"
Move-Item "\service\AuthMailService.java" "\auth\service"
Move-Item "\service\AuthService.java" "\auth\service"
Move-Item "\service\LoggingAuthMailService.java" "\auth\service"

Move-Item "\repository\AuthUserRepository.java" "\auth\repository"
Move-Item "\repository\EmailVerificationTokenRepository.java" "\auth\repository"
Move-Item "\repository\PasswordResetTokenRepository.java" "\auth\repository"
Move-Item "\repository\TechnicianInviteRepository.java" "\auth\repository"

Move-Item "\domain\AccountStatus.java" "\auth\domain"
Move-Item "\domain\AuthProviderType.java" "\auth\domain"
Move-Item "\domain\AuthUser.java" "\auth\domain"
Move-Item "\domain\EmailVerificationToken.java" "\auth\domain"
Move-Item "\domain\PasswordResetToken.java" "\auth\domain"
Move-Item "\domain\TechnicianInvite.java" "\auth\domain"
Move-Item "\domain\UserRole.java" "\auth\domain"
Move-Item "\domain\AvailabilityWindow.java" "\facilities\domain"

Move-Item "\dto\Auth*.java" "\auth\dto"
Move-Item "\dto\CreateTechnicianInviteRequest.java" "\auth\dto"
Move-Item "\dto\ForgotPasswordRequest.java" "\auth\dto"
Move-Item "\dto\GoogleOnboardingRequest.java" "\auth\dto"
Move-Item "\dto\GoogleOnboardingResponse.java" "\auth\dto"
Move-Item "\dto\InviteAcceptanceRequest.java" "\auth\dto"
Move-Item "\dto\InviteDetailsResponse.java" "\auth\dto"
Move-Item "\dto\LoginRequest.java" "\auth\dto"
Move-Item "\dto\RegisterRequest.java" "\auth\dto"
Move-Item "\dto\ResetPasswordRequest.java" "\auth\dto"
Move-Item "\dto\TechnicianInviteResponse.java" "\auth\dto"
Move-Item "\dto\UpdateUserStatusRequest.java" "\auth\dto"

Move-Item "\security\*" "\auth\security"
Remove-Item "\security" -Recurse

Move-Item "\config\AuthBootstrapConfig.java" "\config"
Move-Item "\config\AuthProperties.java" "\config"
Move-Item "\config\SecurityConfig.java" "\config"
Move-Item "\config\WebConfig.java" "\config"

Move-Item "\controller\FacilityAssetController.java" "\facilities\controller"
Move-Item "\service\FacilityAssetService.java" "\facilities\service"
Move-Item "\repository\FacilityAssetRepository.java" "\facilities\repository"
Move-Item "\domain\FacilityAsset.java" "\facilities\domain"
Move-Item "\domain\ResourceStatus.java" "\facilities\domain"
Move-Item "\domain\ResourceType.java" "\facilities\domain"

Move-Item "\dto\FacilityAsset*.java" "\facilities\dto"
Move-Item "\dto\UpdateFacilityAssetStatusRequest.java" "\facilities\dto"
Move-Item "\dto\AvailabilityWindow*.java" "\facilities\dto"

Write-Output 'Done.'
